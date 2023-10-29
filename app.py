from flask import Flask
from flask import render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
import hashlib
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:091201@localhost:5432/proyecto_seguridad'
db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    hashed_password = db.Column(db.LargeBinary(32), nullable=False)
    salt = db.Column(db.LargeBinary(16), nullable=False)

class Password(db.Model):
    __tablename__ = 'passwords'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    app_name = db.Column(db.String(255), nullable=False)
    encrypted_password = db.Column(db.LargeBinary(255), nullable=False)
    iv = db.Column(db.LargeBinary(255), nullable=False)

@app.route('/get-salt', methods=['GET'])
def get_salt():
    user_id = session.get('user_id')
    user = User.query.filter_by(id=user_id).first()
    return jsonify({'salt': user.salt.decode('latin-1')})

@app.route('/get-username', methods=['GET'])
def get_username():
    user_id = session.get('user_id')
    user = User.query.filter_by(id=user_id).first()
    return jsonify({'username': user.username})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return render_template('dashboard.html')
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()
        valid = False

        if user is not None:
            if user.hashed_password == hashlib.pbkdf2_hmac('sha-256', password.encode('utf-8'), user.salt, 600001):
                valid = True

        if valid:
            # VERIFICAR 
            session['user_id'] = user.id
            session['master_password'] = password
            session['salt'] = user.salt
            return jsonify({'success': True, 'redirect': url_for('dashboard')})
        else:
            return  jsonify({'success': False, 'message': 'Login failed. Please check your credentials.'})

    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return  jsonify({'success': False, 'message': 'Signup failed. Already existing user.'})
        
        salt = os.urandom(16)
        hashed_password = hashlib.pbkdf2_hmac('sha-256', password.encode('utf-8'), salt, 600001)
        new_user = User(username=username, hashed_password=hashed_password, salt=salt)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'success': True, 'redirect': url_for('login')})

    return render_template('signup.html')

@app.route('/dashboard')
def dashboard():
    if 'user_id' in session:
        return render_template('dashboard.html')
    else:
        return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('master_password', None)
    session.pop('salt', None)
    return redirect(url_for('login'))

@app.route('/store_password', methods=['POST'])
def store_password():
    if 'user_id' in session:
        data = request.get_json()
        app_name = data.get('appName')
        existing_password = Password.query.filter_by(user_id=session['user_id'], app_name=app_name).first()
        if existing_password:
            return jsonify({'success': False, 'redirect': url_for('dashboard')})
        new_password = Password(user_id=session['user_id'], app_name=app_name, encrypted_password=bytes(data.get('encryptedData')), iv=bytes(data.get('iv')))
        db.session.add(new_password)
        db.session.commit()
        return jsonify({'success': True, 'redirect': url_for('dashboard')}) 
    return redirect(url_for('login'))

@app.route('/get-encrypted-password', methods=['GET'])
def get_encrypted_password():
    user_id = session.get('user_id')
    app_name = request.args.get('appName')
    password = Password.query.filter_by(user_id=user_id, app_name=app_name).first()
    iv = [byte for byte in password.iv]
    encrypted_password = [byte for byte in password.encrypted_password]
    return jsonify({'encrypted_password': encrypted_password,'iv': iv})

if __name__ == '__main__':
    app.secret_key = "test"
    app.run()