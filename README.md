node-backup
===========

Simple node.js script to backup files and folders from a computer to an S3 bucket.


Configuration
-------------

configuration settings can be set in `.env` file and will need to be set to your needs.

Bucket Configuration
--------------------

You may worry about the possibility of someone accessing sensitive S3 credentials in the configuration file. You can configure a bucket policy for a discreet backup user that will allow them to write backups to S3 but not list or download any previous backup data.

```
{
  "Version": "2019-06-27",
  "Statement": [
    {
      "Action": [
        "s3:GetBucketAcl",
        "s3:GetObjectAcl",
        "s3:PutObject"
      ],
      "Sid": "Stmt1373697306000",
      "Resource": [
        "arn:aws:s3:::bucket_name_here/*",
        "arn:aws:s3:::bucket_name_here"
      ],
      "Effect": "Allow"
    }
  ]
}
````
