const fs = require('fs');
const { spawn } = require('child_process');
const process = require('process');

//initialize configuration
let config = JSON.parse(fs.readFileSync(__dirname + '/config.json').toString());

let python = config.python_cmd;
let weibo_crawler = config.crawler_base_path;
let weibo_user_list = config.weibo_user_list_path;
let crawler_config = 'config.json';

let isProcessing = false;
let crawlWorker;

console.log('config-->' + JSON.stringify(config));


function CrawlWorker(){
    if(!isProcessing){
        isProcessing = true;
        let config_crawler = JSON.parse(fs.readFileSync(weibo_crawler + crawler_config));
        //config user list file
        config_crawler.user_id_list = weibo_user_list;
        config_crawler.since_date = oneHourBeforeTimestamp();
        //delete previous config.json
        fs.unlinkSync(weibo_crawler + crawler_config);
        fs.writeFileSync(weibo_crawler + crawler_config, JSON.stringify(config_crawler));
        //change current working directory to weibo_spider
        process.chdir(weibo_crawler);
        //command --> python3.8 -m weibo_spider --config_path="config.json"
        let cmd = spawn(python, ['-m', 'weibo_spider', '--config_path=config.json']);
        cmd.stdout.on('data', (data) => {
            console.log('[weibo_spider output] ' + data);
        });

        cmd.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
            isProcessing = false;
        });

        cmd.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            isProcessing = false;
        });
    }else{
        console.log('the last processing has not finished yet');
    }


}

//initial process
CrawlWorker();
//start worker
crawlWorker = setInterval(CrawlWorker, 3600000);//crawl weibo data per hour


//local functions

//return current time formatted in YYYY:MM:DD hh:mm:ss
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

    return year + "-" + month + "-" + date + ' ' + hour + ':' + minute +':' + second;

}

function oneHourBeforeTimestamp(){
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    date = date < 10? '0' + date : date;
    let month = date_ob.getMonth() + 1;
    month = month < 10? '0' + month : month;

    let year = date_ob.getFullYear();

    let hour = date_ob.getHours() - 1;
    hour = hour < 10? '0' + hour : hour;

    let minute = date_ob.getMinutes();
    minute = minute < 10? '0' + minute : minute;

    let second = date_ob.getSeconds();
    second = second < 10? '0' + second : second;

    return year + "-" + month + "-" + date + ' ' + hour + ':' + minute;

}