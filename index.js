
require ('dotenv').config();
const express = require('express');
const app = express();

const fileUpload = require ('express-fileupload');
const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const httpStatus = require("http-status");


const cors= require('cors');

/**  
* added allowed Origins
*/
let allowedOrigins = [ 'http://localhost:8080', 'http://localhost:1234','http://localhost:4200','http://cineflix-app.s3-website.eu-central-1.amazonaws.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      let message = "The CORS policy for this application doesn't allow access from origin" + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));


//added fileUpload
app.use(fileUpload({
  useTempFiles: true ,
  tempFileDir: '/tmp/',
  debug: true
}));

const s3Client = new S3Client({
  region: 'eu-central-1', // Replace with the region aws 
  
});



//////////////////////////////////////////////////////////
/////////////////////AWS SDK//////////////////////////////

// Endpoint  to list objects in the image bucket
//app.get('/images',  (req, res) => {
  //const listObjectsParams = {
    //  Bucket: process.env.BUCKET_NAME, // Replace 
  //};

  //const listObjectsCmd = new ListObjectsV2Command(listObjectsParams);

  //s3Client.send(listObjectsCmd)
    //  .then((listObjectsResponse) => {
         // res.json(listObjectsResponse.Contents);
      //   res.send(listObjectsResponse)
      //})
      //.catch((error) => {
        //  console.error(error);
        //  res.status(500).json({ error: 'Error listing objects in S3' });
      //});
//});

//de la otra app 
const getImageListService = async () => {
  const listObjectsCmd = new ListObjectsV2Command({
    Bucket: process.env.BUCKET_NAME,
   // Prefix: `users/resized-images`,
  });

  const response = await s3Client.send(listObjectsCmd)

  return response;
}


const getImageList = async (req, res) => {
  const inputData = req.params;

  try {
    const response = await getImageListService(inputData);
    res.status(httpStatus.OK).json({
        success: true,
        message: "Object list fetched successfully",
        data: response,
      });
  } catch (error) {
    res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: `Error occurred fetching file list. ${error}`,
    });
  }
};

app.get('/images', getImageList);




// Endpoint to upload images to S3
//app.post('/images',  (req, res) => {
  //const file = req.files.image;
  //const fileName = req.files.image.name;
  //const tempPath = `./uploads/${fileName}`;

  //file.mv(tempPath, (err) => {
    //  if (err) {
      //    return res.status(500).json({ error: 'Error saving the file' });
     // }

      //const uploadParams = {
        //  Bucket: process.env.BUCKET_NAME, 
         // Key: fileName,
         // Body: fs.readFileSync(tempPath),
      //};

      //const putObjectCmd = new PutObjectCommand(uploadParams);

      //s3Client.send(putObjectCmd)
        //  .then((uploadResponse) => {
              // Delete the file from the temporary path 
          //    fs.unlinkSync(tempPath);
            //  res.json({ success: true, data: uploadResponse });
          //})
          //.catch((error) => {
            //  console.error(error);
            //  res.status(500).json({ error: 'Error uploading the file to S3' });
          //});
  //});
//});
// de la otra app
const addImagesService = async ( fileContent, fileName) => {
  console.log(fileName);

  const command = new PutObjectCommand({
    "Bucket": process.env.BUCKET_NAME,
    "Key": `/${fileName}`,
    "Body": fileContent,
  })

  const response = await s3Client.send(command);

  return response;
}

const addImages = async (req, res) => {
  const inputData = req.params;
  const file = req.files.file;
  const fileName = req.files.file.name;
  const fileContent = fs.readFileSync(file.tempFilePath);
 try {
   const response = await addImagesService(inputData, fileContent, fileName);
   res.status(httpStatus.OK).json({
        success: true,
        message: "Object uploaded successfully",
        data: response,
      });
  } catch (error) {
    res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: `Error occurred uploading file. ${error}`,
    });
  }
}
app.post('/images', addImages);

// Endpoint to retrieve an object from S3
//app.get('/images/:objectKey',  (req, res) => {
  //const objectKey = req.params.objectKey;
  //const bucketName = process.env.BUCKET_NAME; // Replace with the name of the bucket S3

  //const getObjectParams = {
    //  Bucket: bucketName,
    //  Key: objectKey,
  //};

  //const getObjectCmd = new GetObjectCommand(getObjectParams);

  //s3Client.send(getObjectCmd)
    //  .then(({ Body }) => {
      //    res.send(Body);
      //})
      //.catch((error) => {
        //  console.error(error);
        //  res.status(500).json({ error: 'Error to retrieve an object from S3' });
      //});
//});
// de la otra app
const getImageService = async (objectKey) => {
  const command = new GetObjectCommand({
    "Bucket": process.env.BUCKET_NAME,
    "Key": objectKey,
  });

  const response = await s3Client.send(command)

  return response;
}

const getImage = async (req, res) => {
  const {objectKey} = req.params;
  const fileName = objectKey.split("/").pop();
  console.log(objectKey, fileName);
  try {
    const response = await getImageService(objectKey);
    const stream = response.Body;
    fs.writeFileSync(`/tmp/${fileName}`, Buffer.concat(await stream.toArray()));
+     res.status(httpStatus.OK).sendFile(`/tmp/${fileName}`);
  } catch (error) {
    res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: `Error occurred during fetching file. ${error}`,
    });
  }
};

app.get('/images/:objectKey', getImage);


//////////////////////////////////////////////////////////////////////////

/**
 * express.static function for the public folder containing the documentation file
 */
app.use(express.static('public'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

//-----------------------------------------------------------------------------------------
const port = process.env.PORT || 8080;
app.listen(port,'0.0.0.0', () => {
  console.log('Listening on Port' + port);
});