var express = require('express');
let fs = require('fs-extra');
let router = express.Router();
const uuidv4 = require('uuid/v4');
let multer  = require('multer');
let path = require('path');
var mime = require('mime-to-extensions')

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
    //...

    res.send(req.imagesFolder);
  }
});

router.get('/twoFacesMorphingRes', function(req, res, next) {
  if(req.query.imagesFolder == "undefinied")
  {
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
    res.render('twoFacesMorphingRes', { img1Path: filesFiltered[0], img2Path: filesFiltered[1]});
  } 
});

router.get('/multipleFacesMorphingForm', function(req, res, next) {
  res.render('multipleFacesMorphingForm');
});

router.post('/multipleFacesMorphingRes', upload.any(), function(req, res, next) {
  //If at least two faces are not sent. Should not be the case because the form prevents it
  if(typeof req.files == 'undefined' || req.files.length < 2)
  {
    res.render('main');
  }
  else
  {
    //generate interpolated images
    //...

    let inputImgs = [];
    for (let imgIndex in req.files) {
    let validPath =  req.files[imgIndex].path.replace(/\\/g,"/").replace('public/','');
    inputImgs.push(validPath);
    }

    res.render('multipleFacesMorphingRes', { inputImgs: inputImgs});
  }
  
});

module.exports = router;
