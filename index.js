require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const { response } = require('express');


// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology:true});

let urlSchema = new mongoose.Schema({
  original: {type:String, required: true},
  short: Number
});
let Url = mongoose.model('Url', urlSchema);

app.use(bodyParser.urlencoded({extended: false})); //si no anda, meter esto como segundo argumento del post

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
let resObj = {};
app.post('/api/shorturl', function(req, res) {
  let inputUrl = req.body['url'];

  let urlRegex = new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi);
  if (!inputUrl.match(urlRegex)) { //si no matchea con la regex de la url de acá arriba
    res.json({error: 'Invalid URL'});
    return
  }

  resObj['originalUrl'] = inputUrl;
  //acá tengo que intentar buscar el mayor inputShort, y sumarle uno para definir el nuevo inputShort
  let inputShort = 1;
  Url.findOne({})  //cuando le paso un objeto vacío, no le estoy dando ningún criterio de selección, por lo cual selecciona todos los registros
        .sort({short: 'desc'}) //los ordeno por el key short, descendente. entonces abajo en el resultado, como es find one, me agarra el de arriba de todos, o sea el mayor shortUrl
        .exec((error, result) => { //con esta línea ejecutamos, y le meto una callback function con error y result
          if (!error && result != undefined) { //si no es error AND result distinto a undefined, o sea, si encontramos un shortUrl máximo
            inputShort = result.short + 1; //el nuevo inputShort va a ser igual al valor del key short del resultado (que consiste en una url original y un shorturl) + 1
          }
          //acá ya definí si shortUrl es = 1 o si es otro número, pero ya lo tengo
          if (!error) { //en este bucle intentaré buscar y reemplazar, en vez de agregar. Es para que no se me dupliquen los registros si meto un url repetido alguna vez
            Url.findOneAndUpdate( //tiene 4 argumentos (por lo menos)
              {original: inputUrl}, //1 el objeto a buscar/reemplazar
              {original: inputUrl, short : inputShort}, //2 el objeto con el que reemplazo
              {new: true, upsert: true}, // 3 las opciones. en este caso new devuelve el objeto actualizado y no el original. Y upsert crea el objeto si este no existe
              (error, savedUrl) => { //el 4to es la callback function, que toma como input el error si lo hubiera, y la savedUrl, tanto si es nueva como si fue updateada 
                if (!error){  //si no hay error
                  resObj['short_url'] = savedUrl.short;  //seteo el short_url del resObj como la savedUrl.short
                  res.json(resObj); //lo pongo acá para que devuelva el json sólo si todo funcionó perfecto
                }
              }
            )
          }
        })

  
});

//acá voy a hacer que si pongo el shortUrl, me mande a la página

app.get('/api/shorturl/:input', (req,res) => {
  let input = req.params.input;
  Url.findOne({short: input}, (error, result) => {
    if(!error && result != undefined) {
      res.redirect(result.original);
    } else {
      res.json({error: 'Url not found'});
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
