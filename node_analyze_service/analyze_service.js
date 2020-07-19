const mysql = require('mysql');
const fs = require('fs');

let start_time;
let end_time;
let startAnalyzing = false;
let analyzeWorker;

//initialize configuration
let config = JSON.parse(fs.readFileSync(__dirname + '/config.json').toString());


let connection = mysql.createConnection(config);
console.log('start connecting to mysql');
connection.connect();

function AnalyzeWorker(){
    if(!startAnalyzing){
        startAnalyzing = true;
        start_time = getTimestamp(3);//3 hours before
        end_time = getTimestamp(0);//present time
        let sql = 'select id,user_id,content,article_url,video_url,original,up_num,retweet_num,comment_num,publish_time from weibo where publish_time>' + start_time +'and publish_time<'+ end_time + '';
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            let len = results.length;
            console.log('found ' + len + ' results');
            for(let i=0; i<len; i++){
                console.log('item--> ', results[i]);
            }
            startAnalyzing = false;

        });
    }

}

//initial analyze
AnalyzeWorker();
analyzeWorker = setInterval(AnalyzeWorker, 600000);//start analyzing at interval of 10 minutes, analyze the data of the previous 3 hours


//return current time formatted in YYYY:MM:DD hh:mm:ss
function getTimestamp(offset){
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    date = date < 10? '0' + date : date;
    let month = date_ob.getMonth() + 1;
    month = month < 10? '0' + month : month;

    let year = date_ob.getFullYear();

    let hour = date_ob.getHours() - offset;
    hour = hour < 10? '0' + hour : hour;

    let minute = date_ob.getMinutes();
    minute = minute < 10? '0' + minute : minute;

    let second = date_ob.getSeconds();
    second = second < 10? '0' + second : second;

    return year + "-" + month + "-" + date + ' ' + hour + ':' + minute +':' + second;

}