var express = require('express');
let fs = require('fs-extra');
let router = express.Router();
const uuidv4 = require('uuid/v4');
let multer  = require('multer');
let path = require('path');
var mime = require('mime-to-extensions')
const { execFile } = require('child_process');
var archiver = require('archiver');
var rimraf = require('rimraf');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path = __dirname.replace("routes","public") + "/images/" + req.imagesFolder + '/'; //a different folder for each request
    file.path = path;
    if (!fs.existsSync(path)){
      fs.mkdirSync(path);
    }
    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '.' + mime.extension(file.mimetype));
  }
})
let upload = multer({ storage: storage });

const preuploadMiddleware = (req, res, next) => {
  deleteExcessPastRequests();
  req.imagesFolder = uuidv4();
  next();
};

let faceMorpherExePath = path.join(__dirname , "..", "faceMorpher", "FaceMorpher.exe");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main');
});

/* GET home page. */
router.get('/tutorial', function(req, res, next) {
  res.render('tutorial');
});

router.get('/twoFacesMorphingForm', function(req, res, next) {
  res.render('twoFacesMorphingForm');
});

router.post('/twoFacesMorphingForm/UploadImages', preuploadMiddleware, upload.any(), function(req, res, next) {
  //If the two faces are not sent. Should not be the case because the form prevents it
  if(typeof req.files == 'undefined' || req.files.length < 2)
  {
    res.send('');
  }
  else
  {
    //generate interpolated images
    let pathGeneratedImgs = path.join(__dirname, "..", 'public' , 'images', req.imagesFolder, 'generatedImages') + "\\";
    fs.mkdirSync(pathGeneratedImgs);
    let argsMorphing = ["twofaces", req.files[0].path, req.files[1].path, pathGeneratedImgs, req.body.nbrImgs.toString(), req.body.heightImgs.toString(), req.body.widthImgs.toString()];
    process.chdir( path.join(__dirname + "/..", 'facemorpher')); //change current directory for the exe call
    const child = execFile(faceMorpherExePath, argsMorphing, (error, stdout, stderr) => 
    {
      process.chdir('..'); //change back the root current directory for later uses
      if (error) 
      {
        res.send('');
      }
      else
      {
        res.send(req.imagesFolder);
      }
    });
  }
});

router.get('/twoFacesMorphingRes', function(req, res, next) {
  if(req.query.imagesFolder == "undefinied")
  {
    return res.render('main');
  }
  if(req.query.imagesFolder == "")
  {
    return res.render('twoFacesMorphingRes', { error: true});
  }

  let pathGeneratedImgs = path.join( __dirname, "..", 'public', 'images' , req.query.imagesFolder , 'generatedImages') + "/";
  let files = fs.readdirSync(pathGeneratedImgs);
  let imgsPath = [];
  for (let i in files)
  {
    //todo: assure files are imgs, as it can also be a file .zip if the user downloaded the generated images
    imgsPath.push( './images/'+ req.query.imagesFolder + '/generatedImages/' + files[i]);
  }
  
  if(imgsPath.length < 2)
  {
    res.render('main');
  } 
  else
  {
    let img1Path = imgsPath[imgsPath.length-2];
    let img2Path = imgsPath[imgsPath.length-1];
    imgsPath.splice(imgsPath.length-2, 2); //imgsPath now contains only the morphing images
    //to have a morphing transition from beginning to end
    imgsPath.sort(function(x, y) 
    {
      let keepIndex = function(str)
      {
        let split = str.split("/");
        str = split[split.length-1];
        str= str.substring(0,str.search("_"));
        str = str.replace("Morphing", "");
        return parseInt(str);
      };

      if (keepIndex(x) < keepIndex(y)) {
        return -1;
      }
      else {
        return 1;
      }
    }); 
    res.render('twoFacesMorphingRes', { img1Path: img1Path, img2Path: img2Path, morphingsImgs : imgsPath, error: false});
  } 
});

router.get('/twoFacesMorphingRes/Download', function(req, res, next) 
{
  return downloadFiles(req.query.imagesFolder, res);
});

router.get('/multipleFacesMorphingForm', function(req, res, next) {
  res.render('multipleFacesMorphingForm');
});

router.post('/multipleFacesMorphingForm/UploadImages', preuploadMiddleware, upload.any(), function(req, res, next) {
  //If the two faces are not sent. Should not be the case because the form prevents it
  if(typeof req.files == 'undefined' || req.files.length < 2)
  {
    res.send('');
  }
  else
  {
    //hack: one not desired image is sent, I don't know why. Delete it.
    fs.unlinkSync( path.join(__dirname, "..", "public" , "images", req.imagesFolder, "images.jpeg"));

    //generate interpolated images
    let pathImgs = path.join(__dirname, "..", 'public' , 'images', req.imagesFolder) + "/";
    let pathGeneratedImgs = path.join(__dirname, "..", 'public' , 'images' , req.imagesFolder, 'generatedImages') + "/";
    fs.mkdirSync(pathGeneratedImgs);
    let argsMorphing = ["multiplefaces", pathImgs, pathGeneratedImgs, req.body.nbrImgs.toString(), req.body.heightImgs.toString(), req.body.widthImgs.toString()];
    process.chdir(path.join(__dirname, "..", 'facemorpher') + "/"); //change current directory for the exe call
    const child = execFile(faceMorpherExePath, argsMorphing, (error, stdout, stderr) => 
    {
      process.chdir('..'); //change back the root current directory for later uses
      if (error) 
      {
        res.send('');
      }
      else
      {
        res.send(req.imagesFolder);
      }
    });
  }
});

router.get('/multipleFacesMorphingRes', function(req, res, next) 
{
  if(req.query.imagesFolder == "undefinied" || req.query.imagesFolder == "")
  {
    //todo: when req.query.imagesFolder == "" redirect to error page
    return res.render('main');
  }

  let dirImgsInput = path.join( __dirname, "..", "public" , "images", req.query.imagesFolder);
  let files = fs.readdirSync(dirImgsInput);
  let imgsInput = [];
  for (let i in files)
  {
      var name = dirImgsInput + '/' + files[i];
      if (!fs.statSync(name).isDirectory())
      {
        imgsInput.push( './images/' + req.query.imagesFolder + "/" + files[i]);
      }
  }

  let dirImgsGenerated = path.join( __dirname, "..", 'public', 'images', req.query.imagesFolder, 'generatedImages');
  files = fs.readdirSync(dirImgsGenerated);
  let imgsGenerated = [];
  for (let i in files)
  {
      //assure files are imgs, as it can also be a file .zip if the user downloaded the generated images 
      //or .txt, describing the ancestors of generated images
      if( path.extname(files[i]) != '.zip' && path.extname(files[i]) != '.txt')
      {
        imgsGenerated.push( "./images/" + req.query.imagesFolder + '/generatedImages/' + files[i]);
      }
  }

  if(imgsInput.length < 2 || imgsGenerated.length < 2)
  {
    res.render('main');
  } 
  else
  {
    res.render('multipleFacesMorphingRes', { inputImgs: imgsInput, generatedImgs: imgsGenerated});
  } 
});

router.get('/multipleFacesMorphingRes/Download', function(req, res, next) 
{
  return downloadFiles(req.query.imagesFolder, res);
});

function downloadFiles(requestImgsFolder, res)
{
  let dirImgsInput = path.join( __dirname, "..", "public", "images", requestImgsFolder, "generatedImages");
  let files = fs.readdirSync(dirImgsInput);
  let imgsAndTxt = []; //includes the txt file describing the parents of each generated img
  for (let i in files)
  {
    imgsAndTxt.push(path.join(__dirname, "..", 'public' , 'images', requestImgsFolder, 'generatedImages', files[i]));
  }
  
  let outputPath = path.join( __dirname, "..", 'public' , 'images', requestImgsFolder, 'generatedImages', 'morphedImages.zip');
  return zipFiles(imgsAndTxt, outputPath, res);
};

//zip files and return to download to the user
function zipFiles(filesToZipPath, outputPath, res)
{
  res.header('Content-Type', 'application/zip');
  res.header('Content-Disposition', 'attachment; filename="morphingImages.zip"');
  var archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });
  archive.pipe(res);
  
  archive.on('error', function(err) 
  {
    //nothing to do: keep only for debug purposes
    return;
  });

  archive.on('finish', function() 
  {
    //nothing to do: keep only for debug purposes
    return;
  });
  
  //archive.pipe(output); // pipe archive data to the file
  
  // append the files to the zip
  for (let i in filesToZipPath)
  {
      archive.file(filesToZipPath[i], { name: path.basename(filesToZipPath[i]) });
  }
  
  // finalize the archive (ie we are done appending files but streams have to finish yet)
  // 'close' or 'end' may be fired right after calling this method so register to them beforehand
  archive.finalize();
};

function deleteExcessPastRequests()
{
  const NBR_REQUESTS_EXCESS = 100;
  let dirPastRequests = path.join( __dirname, "..", 'public', 'images');
  let pastRequests = fs.readdirSync(dirPastRequests)
                       .filter(file => fs.statSync(path.join(dirPastRequests, file)).isDirectory());
  if(pastRequests.length >= NBR_REQUESTS_EXCESS)
  {
    //delete all folders of the requests
    for(let i = 0; i < pastRequests.length; ++i)
    {
      let pathFolderToDelete = path.join(dirPastRequests, pastRequests[i]);
      rimraf(pathFolderToDelete, function () {}); //async is necessary here so user do not wait
    }
  }
};


module.exports = router;
