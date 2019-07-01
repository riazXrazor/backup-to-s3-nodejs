require('dotenv').config()
const fs = require('fs'),
	  path = require('path'),
	  async = require('async'),
	  moment = require('moment'),
	  AWS = require('aws-sdk');


const opts = {
		errorEventName:'error',
			logDirectory:'logs',
			fileNamePattern:'<DATE>.log',
			dateFormat:'YYYY.MM.DD'
};
const log = require('simple-node-logger').createRollingFileLogger( opts );

const DELETE_DAYS = process.env.DELETE_DAYS;	  
const PATHS = [];

PATHS.push(process.env.MY_BACKUP);

AWS.config.update({ accessKeyId: process.env.MY_ACCESS_ID, secretAccessKey: process.env.MY_ACCESS_SECRET_KEY });


var backupPaths = function() {
	var date = new Date();
	log.info(`Beginning backup operations ${date}`);

	// Iterate each backup target
	async.eachSeries(PATHS, function(path, callback) {
		try {
			backupPath({path: path, date: date, complete: callback});
		} catch(exception) {
			log.warn("Unhandled Exception: " + exception);
		}
	}, function(err) { 
		log.info('Backup operation complete'); 
		 setTimeout(function(){
			process.exit(0);
		 },1000)
	});
}

var backupPath = function(sbackupInfo) {

	let backupInfo = Object.assign({},sbackupInfo);
	log.info("Folder: "+backupInfo.path)

	let daytocheckfor = moment().subtract(DELETE_DAYS, 'days').format('YYYY-MM-DD');
	if(fs.statSync(backupInfo.path).isDirectory())
	{
		let files = fs.readdirSync(backupInfo.path);
		async.eachSeries(files, function(file, callback) {
			try {
				log.info(`File: ${backupInfo.path}${path.sep}${file}`);
				let fileinfo = fs.statSync(`${backupInfo.path}${path.sep}${file}`)
				let createdDate = file.substring(1,9) // date from file name
				createdDate = moment(createdDate, "YYYYMMDD").format('YYYY-MM-DD');
				//log.info(daytocheckfor,createdDate);
				let filecdate = moment(createdDate).format('YYYY-MM-DD');
				
				if(moment(filecdate).isBefore(daytocheckfor)){ // if older then three days delete it
					log.info(`File: ${backupInfo.path}${path.sep}${file} older then ${DELETE_DAYS} days delete`);
					// log.info("delete");
					//fs.unlinkSync(`${backupInfo.path}${path.sep}${file}`);
					callback(null)
				} else {
					if(moment().diff(filecdate, 'days') === 0){ //if todays file upload to s3
						backupInfo.fpath = `${backupInfo.path}${path.sep}${file}`;
						backupInfo.uploadname = file;
						sendToS3(backupInfo,callback)
					}else {
					  callback(null);
					}
				  //log.info("send");
				}

			} catch(exception) {
				log.warn("Unhandled Exception: " + exception);
			}
		}, function(err) { 
			if(err){
				log.warn(err); 
			} else {
				backupInfo.complete();
			}

		});
	}

}


var sendToS3 = function(backupInfo,callback) {
	log.info(`File: ${backupInfo.fpath} uploading... `);
	//  log.info(`${backupInfo.uploadname}`)
	//  log.info(backupInfo)

	fs.readFile(backupInfo.fpath, function (err, data) {
		if (err) { throw err; }
	  
		var base64data =  Buffer.from(data, 'binary');
	    const s3 = new AWS.S3();
		s3.upload({
		  Bucket: process.env.MY_BUCKET_NAME,
		  Key: backupInfo.uploadname,
		  Body: base64data,
		  ACL: 'public-read'
		},function (err,data) {
			if (err){ 
				log.warn(`File: ${backupInfo.fpath} not uploaded`);
				log.warn(err, err.stack);
			} else {
		  		log.info(`File: ${backupInfo.fpath} uploaded `);
			}
		  callback();
		});
	  
	  });

}

backupPaths();
