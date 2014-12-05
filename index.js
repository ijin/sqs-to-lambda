#! /usr/bin/env node

var AWS = require('aws-sdk');
var argv = require('yargs').argv;
var Consumer = require('sqs-consumer');

var region = argv.region;
var queueUrl = argv.queueUrl;
var functionName = argv.functionName;

if (!region || !queueUrl || !functionName) {
  console.log('Usage: sqs-to-lambda --queueUrl <queue-url> --functionName <function-name> --region <region>');
  process.exit();
}

var app = new Consumer({
  queueUrl: queueUrl,
  region: region,
  handleMessage: handleMessage
});

var lambda = new AWS.Lambda({
  region: region
});

function handleMessage(message, done) {
  console.log(new Date().toString());
  console.log("Received SQS message:");
  console.log(message);
  var body = JSON.stringify(JSON.parse(message.Body)).replace(/\\"/g, '!!'); // escape to workaround this problem: https://forums.aws.amazon.com/thread.jspa?threadID=166893&tstart=0
  lambda.invokeAsync({
    FunctionName: functionName,
    InvokeArgs: body
  }, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
  done();
}

function verifyLambdaFunction(cb) {
  lambda.getFunction({
    FunctionName: functionName
  }, cb);
}

app.on('error', function (err) {
  console.error(err.message);
});

verifyLambdaFunction(function (err) {
  if (err) {
    console.error('Could not get Lambda function with name', functionName + ':', err.message);
    process.exit(1);
  }

  app.start();
});
