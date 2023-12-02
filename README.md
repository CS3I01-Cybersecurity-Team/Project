# password-manager


### Set-up

First run the docker script to generate the server and database
```
docker-compose up --build
```

After that you need to create to connect to the psql database to create the app tables. Use the password define in the docker file
```
psql -h localhost -p 5432 -U postgres -d proyecto_seguridad
```

Now generate the tables
```psql
CREATE TABLE passwords (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    app_name CHARACTER VARYING(50) NOT NULL,
    encrypted_password BYTEA NOT NULL,
    iv BYTEA NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username CHARACTER VARYING(20) NOT NULL,
    hashed_password BYTEA NOT NULL,
    salt BYTEA NOT NULL
);
```

now you can acces the application using the following link:
```
http://localhost:5000/
```