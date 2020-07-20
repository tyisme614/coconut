const mysql = require('mysql');
const fs = require('fs');
const base_path = __dirname + '/rank_result/';

if(!fs.existsSync(base_path)){
    if(!fs.mkdirSync(base_path)){
        console.error('unable to create rank_result folder, exit.');
        Process.exit(-1);
    }
}

let start_time;
let end_time;
let startAnalyzing = false;
let analyzeWorker;


const list_enterntain = ['6511184518', '345023523', '2316750444','2619805985', '6070652475', '5474178263',
    '2110705772', '1642904381', '6051750055', '5611783716', '3200673035', '5601456932', '6523466479', '5909342713'];
const list_news = ['1642088277', '1638782947', '1649173367', '2028810631', '2258727970', '1642585887', '1640337222',
    '2032556081', '5567471010', '2868914317', '5436774157', '5710361656', '1644114654', '5044281310', '1686546714', '1663072851', '1499104401', '2127460165'];


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
        let sql = 'select id,user_id,content,article_url,video_url,original,up_num,retweet_num,comment_num,publish_time from weibo where publish_time>"' + start_time +'" and publish_time<"'+ end_time + '"';
        connection.query(sql, function (error, results, fields) {
            if (error) throw error;
            let len = results.length;
            console.log('found ' + len + ' results');
            let top_like_news = [];
            let top_repost_news = [];
            let top_comment_news = [];
            let top_like_entertain = [];
            let top_repost_entertain = [];
            let top_comment_entertain = [];

            for(let i=0; i<len; i++){
                console.log('item--> ', results[i]);
                let item = results[i];
                let user_id = item.user_id;
                //sort in news list
                if(list_news.includes(user_id)){
                    console.log('sort top like news');
                    if(top_like_news.length == 0){
                        top_like_news[0] = item;
                    }else{
                        let j;
                        let len = top_like_news.length >= 20? 20: top_like_news.length;
                        for(j=0; j<len; j++){
                            let w = top_like_news[j];
                            if(w.up_num < item.up_num){
                                //found position
                                top_like_news[j] = item;

                                for(let k=j+1; k<len; k++){
                                    let tmp = top_like_news[k];
                                    top_like_news[k] = w;
                                    w = tmp;
                                }
                            }
                        }
                        if(j == len){
                            //item should be the last one in list
                            top_like_news[j] = item;

                        }
                    }
                    console.log('sort top repost news');
                    if(list_news.includes(user_id)) {
                        console.log('sort top repost news');
                        if (top_repost_news.length == 0) {
                            top_repost_news[0] = item;
                        } else {
                            let j;
                            let len = top_repost_news.length >= 20 ? 20 : top_repost_news.length;
                            for (j = 0; j < len; j++) {
                                let w = top_repost_news[j];
                                if (w.up_num < item.up_num) {
                                    //found position
                                    top_repost_news[j] = item;

                                    for (let k = j + 1; k < len; k++) {
                                        let tmp = top_repost_news[k];
                                        top_repost_news[k] = w;
                                        w = tmp;
                                    }
                                }
                            }
                            if (j == len) {
                                //item should be the last one in list
                                top_repost_news[j] = item;

                            }
                        }
                    }
                    console.log('sort top comment news');
                    if(list_news.includes(user_id)) {
                        console.log('sort top repost news');
                        if (top_comment_news.length == 0) {
                            top_comment_news[0] = item;
                        } else {
                            let j;
                            let len = top_comment_news.length >= 20 ? 20 : top_comment_news.length;
                            for (j = 0; j < len; j++) {
                                let w = top_comment_news[j];
                                if (w.up_num < item.up_num) {
                                    //found position
                                    top_comment_news[j] = item;

                                    for (let k = j + 1; k < len; k++) {
                                        let tmp = top_comment_news[k];
                                        top_comment_news[k] = w;
                                        w = tmp;
                                    }
                                }
                            }
                            if (j == len) {
                                //item should be the last one in list
                                top_comment_news[j] = item;

                            }
                        }
                    }
                }
            }
            writeToLocalFile(JSON.stringify(top_like_news), base_path + currentTimestamp()  + '_top_like.json');
            writeToLocalFile(JSON.stringify(top_repost_news), base_path + currentTimestamp()  + '_top_repost.json');
            writeToLocalFile(JSON.stringify(top_comment_news), base_path + currentTimestamp()  + '_top_comment.json');
            startAnalyzing = false;

        });
    }

}

//initial analyze
AnalyzeWorker();
analyzeWorker = setInterval(AnalyzeWorker, 600000);//start analyzing at interval of 10 minutes, analyze the data of the previous 3 hours


function writeToLocalFile(data, file){
    fs.writeFile(file, data, (err) => {
       if(err)
           console.error(err.toString());
       else
            console.log('finished creating ' + file);
    });
}

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