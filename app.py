from flask import Flask
from flask import render_template, request, redirect, url_for, session
from flask_sqlalchemy import SQLAlchemy
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
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
    url = db.Column(db.String(255), nullable=True)
    app_name = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(255), nullable=True)
    encrypted_password = db.Column(db.LargeBinary(255), nullable=False)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()
        valid = False

        if user is not None:
            if user.hashed_password == hashlib.pbkdf2_hmac('sha-256', password.encode('utf-8'), user.salt, 600001):
                valid = True

        if valid:
            session['user_id'] = user.id
            session['master_password'] = password
            session['salt'] = user.salt
            return redirect(url_for('dashboard'))
        else:
            return "Login failed. Please check your credentials."

    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return "Usuario ya existente"
        
        salt = os.urandom(16)
        hashed_password = hashlib.pbkdf2_hmac('sha-256', password.encode('utf-8'), salt, 600001)
        new_user = User(username=username, hashed_password=hashed_password, salt=salt)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for('login'))

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
        app_name = request.form.get('app-name')
        password = request.form.get('password')
        url = request.form.get('url')
        username = request.form.get('username')
        user_id = session['user_id']

        existing_password = Password.query.filter_by(user_id=user_id, app_name=app_name).first()
        if existing_password:
            return "Contrasena ya existente"
        
        cipher = AES.new(hashlib.pbkdf2_hmac('sha-256', session['master_password'].encode('utf-8'), session['salt'], 600000), AES.MODE_ECB)
        encrypted_password = cipher.encrypt(pad(password.encode('utf-8'), 16))
        password = Password(user_id=user_id, url=url, app_name=app_name, username=username, encrypted_password=encrypted_password)
        db.session.add(password)
        db.session.commit()
        return "Success"
    return redirect(url_for('login'))

@app.route('/get_password', methods=['GET'])
def get_password():
    if 'user_id' in session:
        user_id = session['user_id']

        website_name = request.args.get('website-name')

        if website_name:
            password = Password.query.filter_by(user_id=user_id, app_name=website_name).first()

            if password:
                cipher = AES.new(hashlib.pbkdf2_hmac('sha-256', session['master_password'].encode('utf-8'), session['salt'], 600000), AES.MODE_ECB)
                decrypted_password = unpad(cipher.decrypt(password.encrypted_password), 16).decode('utf-8')
                username = password.username
                url = password.url
                password_result = f'<h3>Password for {website_name}</h3>'
                password_result += f'<p><strong>Username/Email:</strong> {username}</p>'
                password_result += f'<p><strong>Password:</strong> {decrypted_password}</p>'
                password_result += f'<p><strong>URL:</strong> {url}</p>'
                return password_result
            else:
                return "No se encontro el sitio web"

    return redirect(url_for('login'))

if __name__ == '__main__':
    app.secret_key = "test"
    app.run()