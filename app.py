from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, send
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, Room, Message
from datetime import datetime
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chatroom.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
socketio = SocketIO(app, async_mode='threading', cors_allowed_origins="*")

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Store active users and rooms
active_users = {}
active_rooms = {}

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            user.is_online = True
            db.session.commit()
            return redirect(url_for('chat'))
        else:
            flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return render_template('register.html')
        
        user = User(
            username=username,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please log in.')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    user = current_user
    user.is_online = False
    db.session.commit()
    logout_user()
    return redirect(url_for('login'))

@app.route('/chat')
@login_required
def chat():
    rooms = Room.query.all()
    return render_template('chat.html', rooms=rooms)

@app.route('/create_room', methods=['POST'])
@login_required
def create_room():
    room_name = request.form['room_name']
    
    if Room.query.filter_by(name=room_name).first():
        return jsonify({'success': False, 'message': 'Room already exists'})
    
    room = Room(name=room_name, created_by=current_user.id)
    db.session.add(room)
    db.session.commit()
    
    return jsonify({'success': True, 'room_id': room.id, 'room_name': room.name})

# SocketIO Events
@socketio.on('connect')
@login_required
def on_connect():
    active_users[current_user.id] = {
        'username': current_user.username,
        'sid': request.sid
    }
    emit('user_joined', {
        'username': current_user.username,
        'active_users': list(active_users.values())
    }, broadcast=True)

@socketio.on('disconnect')
@login_required
def on_disconnect():
    if current_user.id in active_users:
        del active_users[current_user.id]
    emit('user_left', {
        'username': current_user.username,
        'active_users': list(active_users.values())
    }, broadcast=True)

@socketio.on('join_room')
@login_required
def on_join_room(data):
    room_name = data['room']
    join_room(room_name)
    
    if room_name not in active_rooms:
        active_rooms[room_name] = set()
    active_rooms[room_name].add(current_user.username)
    
    # Send recent messages
    room = Room.query.filter_by(name=room_name).first()
    if room:
        recent_messages = Message.query.filter_by(room_id=room.id).order_by(Message.timestamp.desc()).limit(50).all()
        recent_messages.reverse()
        
        for message in recent_messages:
            emit('message', message.to_dict())
    
    emit('room_joined', {
        'room': room_name,
        'username': current_user.username,
        'active_users': list(active_rooms[room_name])
    }, room=room_name)

@socketio.on('leave_room')
@login_required
def on_leave_room(data):
    room_name = data['room']
    leave_room(room_name)
    
    if room_name in active_rooms:
        active_rooms[room_name].discard(current_user.username)
        if not active_rooms[room_name]:
            del active_rooms[room_name]
    
    emit('room_left', {
        'room': room_name,
        'username': current_user.username
    }, room=room_name)

@socketio.on('send_message')
@login_required
def on_send_message(data):
    room_name = data['room']
    message_content = data['message']
    
    room = Room.query.filter_by(name=room_name).first()
    if not room:
        return
    
    # Save message to database
    message = Message(
        content=message_content,
        user_id=current_user.id,
        room_id=room.id
    )
    db.session.add(message)
    db.session.commit()
    
    # Broadcast message to room
    emit('message', message.to_dict(), room=room_name)

@socketio.on('typing')
@login_required
def on_typing(data):
    room_name = data['room']
    emit('user_typing', {
        'username': current_user.username,
        'room': room_name
    }, room=room_name, include_self=False)

@socketio.on('stop_typing')
@login_required
def on_stop_typing(data):
    room_name = data['room']
    emit('user_stop_typing', {
        'username': current_user.username,
        'room': room_name
    }, room=room_name, include_self=False)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create default room if it doesn't exist
        if not Room.query.filter_by(name='general').first():
            default_room = Room(name='general', created_by=1)
            db.session.add(default_room)
            db.session.commit()
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
