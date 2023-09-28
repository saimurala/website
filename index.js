const express = require('express');
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/RAMYA/Desktop/s/webpage/firebase.json");
const axios = require('axios');
const passwordHash = require("password-hash");
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.use(express.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.sendFile(__dirname + "/login.html");
});

app.get('/home', function(req, res) {
  res.sendFile(__dirname + "/signup.html");
});

app.get('/weather', function(req, res) {
  res.sendFile(__dirname + "/weather.html");
});

app.post('/signupSubmit', function(req, res) {
  const { fullname, email, password } = req.body;
  const hashedPassword = passwordHash.generate(password);

  if (!fullname || !email || !password) {
    return res.status(400).send("Please provide fullname, email, and password.");
  }

  db.collection("signupdata")
    .where("email", "==", email)
    .get()
    .then((docs) => {
      if (docs.size > 0) {
        res.status(400).send("Email already exists. Please try with a different email.");
      } else {
        const userData = {
          fullname: fullname,
          email: email,
          password: hashedPassword
        };

        db.collection("signupdata")
          .add(userData)
          .then(() => {
            res.redirect('/home');
          })
          .catch((error) => {
            console.error("Error adding document: ", error);
            res.status(500).send("Failed to add document to Firestore.");
          });
      }
    })
    .catch((error) => {
      console.error("Error checking for existing email: ", error);
      res.status(500).send("Failed to check for existing email.");
    });
});

app.post('/loginSubmit', function(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Please provide email and password.");
  }

  db.collection("signupdata")
    .where("email", "==", email)
    .where("password", "==", password)
    .get()
    .then((querySnapshot) => {
      if (querySnapshot.empty) {
        res.send("Please sign up first.");
      } else {
        res.redirect('/weather');
      }
    })
    .catch((error) => {
      console.error("Error fetching user data: ", error);
      res.status(500).send("Failed to fetch user data from Firestore.");
    });
});

app.post('/getWeather', function(req, res) {
  const { location } = req.body;

  const locationDocument = {
    location: location,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };

  db.collection("locations")
    .add(locationDocument)
    .then(() => {
      const apiKey = "d7957217c65e9009ffa5a6c20e0efec4";

      axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}`)
        .then(weatherResponse => {
          const weatherData = weatherResponse.data;
          const weatherDescription = weatherData.weather[0].description;
          const temperature = weatherData.main.temp;
          const humidity = weatherData.main.humidity;
          const feelsLike = weatherData.main.feels_like;

          const weatherInfo = `
            Weather in ${weatherData.name}: ${weatherDescription}
            Temperature: ${temperature} K
            Humidity: ${humidity}%
            Feels Like: ${feelsLike} K
          `;

          const weatherDocument = {
            location: weatherData.name,
            description: weatherDescription,
            temperature: temperature,
            humidity: humidity,
            feelsLike: feelsLike
          };

          db.collection("weatherinfo")
            .add(weatherDocument)
            .then(() => {
              res.send(weatherInfo);
            })
            .catch(error => {
              console.error("Error adding weather document: ", error);
              res.status(500).send("Failed to save weather information to Firestore.");
            });
        })
        .catch(error => {
          console.error("Error fetching weather data: ", error);
          res.status(500).send("Failed to fetch weather data.");
        });
    })
    .catch(error => {
      console.error("Error adding location document: ", error);
      res.status(500).send("Failed to save location information to Firestore.");
    });
});

app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
