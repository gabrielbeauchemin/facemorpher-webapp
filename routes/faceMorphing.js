var express = require('express');
let fs = require('fs-extra');
let router = express.Router();
const uuidv4 = require('uuid/v4');
let multer  = require('multer');
let path = require('path');
var mime = require('mime-to-extensions')
const { execFile } = require('child_process');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path = './public/images/' + req.imagesFolder  + '/'; //a different folder for each request
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
  req.imagesFolder = uuidv4();
  next();
};

let faceMorpherExePath = path.resolve("./faceMorpher/FaceMorpher.exe");

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main');
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
    let pathGeneratedImgs = path.resolve('./public/images/' + req.imagesFolder + '/generatedImages') + "\\";
    fs.mkdirSync(pathGeneratedImgs);
    let argsMorphing = ["twofaces", path.resolve('./' + req.files[0].path), path.resolve('./' + req.files[1].path), pathGeneratedImgs, req.body.nbrImgs.toString(), req.body.heightImgs.toString(), req.body.widthImgs.toString()];
    process.chdir('./facemorpher/'); //change current directory for the exe call
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

  let pathGeneratedImgs = path.resolve('./public/images/' + req.query.imagesFolder + '/generatedImages') + "\\";
  let files = fs.readdirSync(pathGeneratedImgs);
  let imgsPath = [];
  for (let i in files)
  {
    imgsPath.push("./images/" + req.query.imagesFolder + '/generatedImages/' + files[i]);
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
    fs.unlinkSync("./public/images/" + req.imagesFolder + "/images.jpeg");

    //generate interpolated images
    //...

    res.send(req.imagesFolder);
  }
});

router.get('/multipleFacesMorphingRes', upload.any(), function(req, res, next) {
  if(req.query.imagesFolder == "undefinied" || req.query.imagesFolder == "")
  {
    //todo: when req.query.imagesFolder == "" redirect to error page
    return res.render('main');
  }

  let dir = "./public/images/" + req.query.imagesFolder
  let files = fs.readdirSync(dir);
  let filesFiltered = [];
  for (let i in files){
      var name = dir + '/' + files[i];
      if (!fs.statSync(name).isDirectory()){
        filesFiltered.push("./images/" + req.query.imagesFolder + '/' + files[i]);
      }
  }
  if(filesFiltered.length < 2)
  {
    res.render('main');
  } 
  else
  {
    res.render('multipleFacesMorphingRes', { inputImgs: filesFiltered});
  } 
});

module.exports = router;
