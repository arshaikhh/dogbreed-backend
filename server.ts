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
  const dbres = await client.query('select sub_breed, sum(vote_count) as sumvote_count from vote  group by sub_breed order by sumvote_count desc limit 10');

  res.json(dbres.rows);
});

function urlExtracting(url:string):string[] {
  const breedAndSubBreed= url.match(/.*\/(.*)\/(.*)$/)[1]
  let breed
  let subBreed
  if (breedAndSubBreed.includes('-')){
    breed = breedAndSubBreed.match(/.*(?=-)/)[0]
    subBreed = breedAndSubBreed.match(/(?<=-).*/)[0]+"-"+breed
 } else {
    breed = breedAndSubBreed
    subBreed = breedAndSubBreed
 }
 return [breed,subBreed]
}

app.post("/", async (req, res) => {
  const url = req.body.message
  const isPresent = await client.query('SELECT CASE WHEN EXISTS (SELECT * FROM vote WHERE image_url = $1)THEN $2 ELSE $3 END',[url,0,1]) //return true if url exists else false
  console.log(isPresent.rows[0].case)
  console.log(url)
  if(isPresent.rows[0].case===0) {
  const[breed,subBreed]=urlExtracting(url)
  const dbres = await client.query('insert into vote (breed, sub_breed, image_url,vote_count) values($1,$2,$3,$4) returning sub_breed',[breed,subBreed,url,0]);
  res.json(dbres.rows);
} else {
  const[breed,subBreed]=urlExtracting(url)
  res.json({sub_breed:subBreed})
}
  } 
  );

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
