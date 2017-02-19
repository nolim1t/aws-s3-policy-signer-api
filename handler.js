'use strict';

function paramByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

const AWS = require('aws-sdk');
var process = require('process');
var crypto = require('crypto');

const aws_secret = process.env.AWSSECRET;
var credentials = new AWS.Credentials({accessKeyId: "AKIAJEPSNX3KAPQHTP6Q", secretAccessKey: aws_secret});
var s3 = new AWS.S3({credentials: credentials});

module.exports.s3signature = (event, context, callback) => {
  var responseMessage = {
    message: 'Hello! here the URL to put the following'
  };
  var responseCode = 400;
  if (event.queryStringParameters !== undefined) {
    if (event.queryStringParameters.path !== undefined) {
      if (event.queryStringParameters.path !== null) {
        var params = {Bucket: 'incoming.itinerantfoodie.com', Key: event.queryStringParameters.path, Expires: 600, 'ACL': 'public-read'};
        if (event.queryStringParameters['file-type'] !== undefined) params['ContentType'] = event.queryStringParameters['file-type']
        var url = s3.getSignedUrl('putObject', params);
        s3.getSignedUrl('putObject', params, (err, data) => {
          if (err) {
            responseCode = 500;
            responseMessage["message"] = "Error signing URL";
          } else {
            responseCode = 200;
            responseMessage["message"] = "Done";
            responseMessage["data"] = data;
            responseMessage["AWSAccessKeyId"] = paramByName("AWSAccessKeyId", data);
            responseMessage["Signature"] = paramByName("Signature", data);
            if (event.queryStringParameters['policystring']) responseMessage["policyencoded"] = crypto.createHmac('sha1', aws_secret).update(event.queryStringParameters['policystring']).digest().toString('base64');
            responseMessage["x-amz-acl"] = paramByName("x-amz-acl", data);
            responseMessage["Expires"] = paramByName("Expires", data);
          }
        })
      }
    }
  }


  var response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
    },
    body: JSON.stringify(responseMessage)
  };

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};
