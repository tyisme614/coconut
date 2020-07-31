var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');
const mysql = require('mysql');
//load mysql configuration
let config = JSON.parse(fs.readFileSync(__dirname + '/config.json').toString());
let mysqlDB = mysql.createConnection(config);
console.log('start connecting to mysql');
mysqlDB.connect();

let clients = [];

//routers
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

//define routes
app.get('/retrieve_data', (req, res) => {
    let sql = 'select * from analyze_record order by timestamp desc limit 6';
    mysqlDB.query(sql, function (error, results, fields) {
        if(error){
            next(createError(500));

        }else{
            if(results.length > 0){
                let responseJSON = [];
                for(let r of results){
                    console.log('loading analysis data -->' + r.path);
                    let analysis = {};
                    analysis.data = fs.readFileSync(r.path);
                    analysis.type = r.type;
                    responseJSON.push(analysis);
                }

                res.statusCode = 200;
                res.send(JSON.stringify(responseJSON));
                res.end();
            }else{
                next(createError(404));
            }

        }

    });

});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



//initialize socket.io
// Create a Socket.IO instance, passing it our server
let socket;
let initializeWebsocket = function(s){
    console.log('initialize socket');
    socket = s;
    socket.on('connection', (client) =>{
        console.log('new client connected');
        console.log('remote client\'s token is ' + client.handshake.query.token);
        if(client.handshake.query.id != ''){
            let id = client.handshake.query.token;
            let c = clients[id];
            if(typeof(c) != 'undefined' && c != null){
                if(c.handshake.query.token != client.handshake.query.token){
                    console.log('token changed, client reconnected, update');
                    //client reconnected, update
                    clients[id] = client;
                }
            }else{
                console.log('client not found, enqueue this one, id-->' + id);
                clients[id] = client;
            }
        }

        client.on('message', (data)=>{
            console.log('Received message from client!' , data);
            let msg = JSON.parse(data);
            console.log('type -->' + msg.type);
            switch(msg.type){
                case 1000://heartbeat
                    let token =  client.handshake.query.token;
                    console.log('heartbeat message -->' +token);
                    let response = {};
                    response.type = 1000;
                    response.content = 'received hb msg from ' + token;
                    client.send(JSON.stringify(response));
                    break;
            }
        });

        client.on('disconnect', ()=>{
            console.log('remote client disconnected, token-->' + client.handshake.query.token);
        } );

    });
}

console.log('start  NewsTopLikeWorker');
let checkNewsTopLike = setInterval(checkDatabase, 1800000, 1001);
console.log('start  NewsTopCommentWorker');
let checkNewsTopComment = setInterval(checkDatabase, 1800000, 1002);
console.log('start  NewsTopRepostWorker');
let checkNewsTopRepost = setInterval(checkDatabase, 1800000, 1003);
console.log('start  EntTopLikeWorker');
let checkEntTopLike = setInterval(checkDatabase, 1800000, 1004);
console.log('start  EntTopCommentWorker');
let checkEntTopComment = setInterval(checkDatabase, 1800000, 1005);
console.log('start EntTopReposWorker');
let checkEntTopRepost = setInterval(checkDatabase, 1800000, 1006);



function checkDatabase(t){
      let sql = 'select * from analyze_record where type="' +t+ '" order by timestamp desc limit 1';
        mysqlDB.query(sql, function (error, results, fields) {
                if (error) throw error;
                console.log(JSON.stringify(results));
                if(results.length > 0){
                    let item = results[0];
                    let currentTS = currentEpochTime();
                    if(currentTS - item.timestamp < 1800000 ){//use the latest result
                        //load analysis file
                        console.log('load file -->' + item.path);
                        fs.readFile(item.path, (err, data) => {
                            if(err){
                                console.error('encountered error while loading analysis results');
                            }
                            if(socket != null){
                                let message = {};
                                message.type = t;
                                message.json = data;
                                for(let c of clients){
                                    c.send(JSON.stringify(message));
                                }
                            }


                        });
                    }
                }else{
                    console.log(currentTimestamp() + '--> results not found');
                }
        });
}



module.exports.initializeWebsocket = initializeWebsocket;
module.exports.express = app;

//local functions
function currentEpochTime(){
    let timezoneOffset = new Date().getTimezoneOffset();//in minutes
    let epoch = Date.now() + timezoneOffset * 60 * 1000;

    return epoch;
}

function currentTimestamp(){
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    date = date < 10? '0' + date : date;
    let month = date_ob.getMonth() + 1;
    month = month < 10? '0' + month : month;

    let year = date_ob.getFullYear();

    let hour = date_ob.getHours();
    hour = hour < 10? '0' + hour : hour;

    let minute = date_ob.getMinutes();
    minute = minute < 10? '0' + minute : minute;

    let second = date_ob.getSeconds();
    second = second < 10? '0' + second : second;

    return year + "-" + month + "-" + date + '_' + hour + ':' + minute +':' + second;

}