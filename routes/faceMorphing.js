var express = require('express');
let fs = require('fs-extra');
let router = express.Router();
const uuidv4 = require('uuid/v4');
let multer  = require('multer');
let path = require('path');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path = './public/images/' + uuidv4() + '/'; //a different folder for each request
    file.path = path;
    fs.mkdirSync(path);
    cb(null, path);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
})
let upload = multer({ storage: storage });

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('main');
});

router.get('/twoFacesMorphingForm', function(req, res, next) {
  res.render('twoFacesMorphingForm');
});

router.post('/twoFacesMorphingRes', upload.any(), function(req, res, next) {
  //If the two faces are not sent. Should not be the case because the form prevents it
  if(typeof req.files == 'undefined' || req.files.length < 2)
  {
    res.render('main');
  }
  else
  {
    //generate interpolated images
    //...

    let img1Path = req.files[0].path.replace(/\\/g,"/").replace('public/','');
    let img2Path = req.files[1].path.replace(/\\/g,"/").replace('public/','');
    res.render('twoFacesMorphingRes', { img1Path: img1Path, img2Path: img2Path});
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
