require('dotenv').config()
const fs = require('fs'),
	  path = require('path'),
	  async = require('async'),
	  moment = require('moment'),
	  AWS = require('aws-sdk');


const PATHS = [
	"/var/www/pa-files/processed-test"
];

AWS.config.update({ accessKeyId: process.env.MY_ACCESS_ID, secretAccessKey: process.env.MY_ACCESS_SECRET_KEY });


var backupPaths = function() {
	console.log('Beginning backup operations');
	var date = new Date();

	// Iterate each backup target
	async.eachSeries(PATHS, function(path, callback) {
		try {
			backupPath({path: path, date: date, complete: callback});
		} catch(exception) {
			console.log("Unhandled Exception: " + exception);
		}
	}, function(err) { 
		console.log('Backup operation complete'); 
	});
}

var backupPath = function(sbackupInfo) {

	let backupInfo = Object.assign({},sbackupInfo);
	console.log("Folder: "+backupInfo.path)

	let daytocheckfor = moment().subtract(3, 'days').format('YYYY-MM-DD');
	if(fs.statSync(backupInfo.path).isDirectory())
	{
		let files = fs.readdirSync(backupInfo.path);
		async.eachSeries(files, function(file, callback) {
			try {
				console.log(`File: ${backupInfo.path}${path.sep}${file}`);
				let fileinfo = fs.statSync(`${backupInfo.path}${path.sep}${file}`)
				let createdDate = file.substring(1,9) // date from file name
				createdDate = moment(createdDate, "YYYYMMDD").format('YYYY-MM-DD');
				//console.log(daytocheckfor,createdDate);
				let filecdate = moment(createdDate).format('YYYY-MM-DD');
				
				if(moment(filecdate).isBefore(daytocheckfor)){ // if older then three days delete it
					console.log(`File: ${backupInfo.path}${path.sep}${file} older then 3 days delete`);
					console.log("delete");
					fs.unlinkSync(`${backupInfo.path}${path.sep}${file}`);
					callback(null)
				} else {
					if(moment().diff(filecdate, 'days') === 0){ //if todays file upload to s3
						backupInfo.fpath = `${backupInfo.path}${path.sep}${file}`;
						backupInfo.uploadname = file;
						sendToS3(backupInfo,callback)
					}else {
					  callback(null);
					}
				  //console.log("send");
				}

			} catch(exception) {
				console.log("Unhandled Exception: " + exception);
			}
		}, function(err) { 
			if(err){
				console.log(err); 
			} else {
				backupInfo.complete();
			}
		});
	}

}


var sendToS3 = function(backupInfo,callback) {
	 console.log('Uploading ' + backupInfo.fpath);
	 console.log(`${backupInfo.uploadname}`)
	 console.log(backupInfo)

	fs.readFile(backupInfo.fpath, function (err, data) {
		if (err) { throw err; }
	  
		var base64data =  Buffer.from(data, 'binary');
	    const s3 = new AWS.S3();
		s3.putObject({
		  Bucket: process.env.MY_BUCKET_NAME,
		  Key: backupInfo.uploadname,
		  Body: base64data,
		  ACL: 'public-read'
		},function (resp) {
		  console.log(resp)
		  console.log(`File: ${backupInfo.fpath} uploaded `);
		  callback();
		});
	  
	  });

}

backupPaths();
