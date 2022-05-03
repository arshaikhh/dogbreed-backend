import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};
//hello
const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();


app.get("/", async (req, res) => {
  const dbres = await client.query('select breed, sum(vote_count) as sumvote_count from vote  group by breed order by sumvote_count desc limit 10');

  res.json(dbres.rows);
});

app.post("/", async (req, res) => {
  const url = req.body.message
  const breedAndSubBreed = url.match(/.*\/(.*)\/(.*)$/)[1]
  let breed;
  let subBreed;
  if (breedAndSubBreed.includes('-')){
     breed = breedAndSubBreed.match(/.*(?=-)/)[0]
     subBreed = breedAndSubBreed.match(/(?<=-).*/)[0]
  } else {
     breed = breedAndSubBreed
     subBreed = ''
  }
  const dbres = await client.query('insert into vote (breed, sub_breed, image_url,vote_count) values($1,$2,$3,$4)',[breed,subBreed,url,0]);
  res.json(dbres.rows);
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
