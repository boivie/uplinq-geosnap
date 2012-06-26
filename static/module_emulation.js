// Copyright Â© 2012 QUALCOMM Incorporated. All Rights Reserved (6/25/12)
// See here for license info: http://developer.qualcomm.com/html5-api-eula

// ==========================================================================
// Camera emulation
// ==========================================================================

// TODO:
// - add more error checking

// BouncyBallCanvas to emulate camera preview video
var Vector = function(start, min, max_cb, step) {
    this.cur = start;
    this.min = min;
    this.max_cb = max_cb;
    this.step = step;
    this.next = function() {
        if (this.cur < this.min) {
            this.cur = this.min;
            this.step = Math.abs(this.step);
        }
        else if (this.cur > this.max_cb()) { 
            this.cur = this.max_cb();
            this.step = Math.abs(this.step) * -1;
        }
        this.cur += this.step;
        return this.cur;
    }
}

var Ball = function(start_x, start_y, start_r, min_r, max_r, fill, canvas) {
    var x = new Vector(start_x, 0, function() {return canvas.width;}, 1);
    var y = new Vector(start_y, 0, function() {return canvas.height;}, 1);
    var r = new Vector(start_r, min_r, function() {return max_r;}, .2);
    var ctx = canvas.getContext("2d");
    this.render = function() {
        ctx.beginPath();
        ctx.arc(x.next(), y.next(), r.next(), 0, Math.PI*2, true); 
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }
}

var BouncyBallCanvas = function() {
    canvas = document.createElement('canvas');
    var balls = [
        new Ball(0, 0, 10, 10, 20, 'rgba(10, 20, 30, .5)', canvas),
        new Ball(100, 0, 10, 20, 40, 'rgba(200, 10, 200, .5)', canvas),
    ];
    var update = function() {
        canvas.width = canvas.width;
        for (var i=0; i<balls.length; i++) {
            balls[i].render();
        }
    };
    canvas.pause = function() {
        if (canvas.timer !== undefined) {
            clearTimeout(canvas.timer);
        }
    }
    canvas.play = function() {
        if (canvas.timer !== undefined) {
            clearTimeout(canvas.timer);
        }
        canvas.timer = setInterval(function() { update(); }, 16);
    }
    canvas.play();
    return canvas;
}


var FeatureValue = function(values, min, max) {
    // values: array of valid values for a specific feature
    // if values is null, then valid values is an int between min and max
    this.values = values;
    this.min = min;
    this.max = max;
}

var Camera = function(name) {
    var FeatureInfo = function (default_value, values, min, max) {
        this.value = default_value;
        this.featureValue = new FeatureValue(values, min, max);
    }

    var features = {
        'QUALITY'            : new FeatureInfo("85", null, "0", "100"),
        'BRIGHTNESS'         : new FeatureInfo("3", null, "0", "100"),
        'WHITE_BALANCE_MODE' : new FeatureInfo("auto", ["auto", "incandescent",
                               "fluorescent", "daylight", "cloudy-daylight"], 
                               null, null),
        'CONTRAST'           : new FeatureInfo("5", null, "0", "10"),
        'FOCUS_MODE'         : new FeatureInfo("auto", ["auto", "infinity", 
                               "normal", "macro", "continuous-picture", 
                               "continuous-video"], null, null),
        'FLASH'              : new FeatureInfo("off", ["off", "auto", "on", 
                               "torch"], null, null),
        'FRAME_RATE'         : new FeatureInfo( "31", ["5", "6", "7", "8", "9", 
                               "10", "11", "12", "13", "14", "15", "16", "17", 
                               "18", "19", "20", "21", "22", "23", "24", "25", 
                               "26", "27", "28", "29", "30", "31"], null, null),
        'EFFECTS'            : new FeatureInfo("none", ["none", "mono", 
                               "negative", "solarize", "sepia", "posterize", 
                               "whiteboard", "blackboard", "aqua", "emboss", 
                               "sketch", "neon"], null, null),
        'FACE_DETECTION'     : new FeatureInfo("on", ["on", "off"], null, null),
        'SHUTTER_SOUND'      : new FeatureInfo('on', ['on', 'off'], null, null),
        'ISO'                : new FeatureInfo("auto", ["auto", "ISO_HJR", 
                               "ISO100", "ISO200", "ISO400", "ISO800", 
                               "ISO1600"], null, null),
        'HIGH_DYNAMIC_RANGE' : new FeatureInfo('off', ['on', 'off'], null, 
                               null),
        'SATURATION'         : new FeatureInfo("5", null, "0", "10"),
        'SHARPNESS'          : new FeatureInfo("10", null, "0", "30"),
        'ZOOM'               : new FeatureInfo("0", null, "0", "59"),
        'RED_EYE_REDUCTION'  : new FeatureInfo('on', ['on', 'off'], null, null),
        'AUTO_EXPOSURE'      : new FeatureInfo('frame-average', 
                               ["frame-average", "center-weighted", 
                               "spot-metering"], null, null),
        'LENSSHADE'          : new FeatureInfo('off', ['on', 'off'], null, 
                               null),
        'DENOISE'            : new FeatureInfo('off', ['on', 'off'], null, 
                               null),
        'ZSL'                : new FeatureInfo('off', ['on', 'off'], null,  
                               null),
        'SCENE_MODE'         : new FeatureInfo('auto', ["auto", "asd", "action",
                               "portrait", "landscape", "night", 
                               "night-portrait", "theatre", "beach", "snow", 
                               "sunset", "steadyphoto", "fireworks", "sports", 
                               "party", "candlelight", "backlight", "flowers",
                               "AR"], null, null),
        'SCENE_DETECT'       : new FeatureInfo('off', ['on', 'off'], null, 
                               null),
        'ANTIBANDING'        : new FeatureInfo('off', ["off", "50hz", "60hz",
                               "auto"], null, null),
        'PREVIEW_SIZE'       : new FeatureInfo('PREVIEW_SIZE', '640x480', 
                               ["1920x1088", "1280x720", "800x480", "768x432", 
                               "720x480", "640x480", "576x432", "480x320", 
                               "384x288", "352x288", "320x240", "240x160",
                               "176x144"], null, null),
        'SKIN_TONE_ENHANCEMENT' : new FeatureInfo('on', ['on', 'off'], 
                                  null, null),
        'EXPOSURE_COMPENSATION' : new FeatureInfo("0", null, "-12", "12")
    };

    this.id = name;
    this.getSupportedFeatureKeys = function() {
        supportedFeatureKeys = [];
        for (var feature in features) {
            supportedFeatureKeys.push(feature);
        }
        return supportedFeatureKeys;
    };
    this.getSupportedFeatureValues = function (featureKey) {
        if (features[featureKey] !== undefined) {
            return features[featureKey].featureValue;
        } else {
            // TODO, raise error
        }
    };
    this.setFeatureValue = function(featureKey, value) {
        // TODO check in range
        features[featureKey].value = value;
    };
    this.getFeatureValue = function(featureKey) {
        if (features[featureKey] !== undefined) {
            return features[featureKey].value;
        } else {
            // TODO, raise error
        }
    };

    var currentPreviewNode = null;

    this.createPreviewNode = function (successCB, failCB) {
        currentPreviewNode = new BouncyBallCanvas();
        successCB(currentPreviewNode);
    };
    this.captureImage = function(successCB, failCB) {
        // pause to simulate camera snapshot
        currentPreviewNode.pause();

        setTimeout( function() {
            dataURI = currentPreviewNode.toDataURL();
            var byteString = atob(dataURI.split(',')[1]);
            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
                for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            currentPreviewNode.play();
            successCB(ab);
       }, 500);
    };
};

var camera1 = new Camera('camera1');

var CameraModule = { 
    getCameras: function(successCB, failCB) {
        successCB([camera1]);
    }
};

// ==========================================================================
// File system emulation
// ==========================================================================

var FileStream = function(getData, setData) {
    var getDataFunc = getData;
    var setDataFunc = setData;

    this.bytesAvailable = getDataFunc().byteLength;
    this.eof = (getDataFunc().byteLength == 0) ? true : false;
    this.position = 0;

    this.writeBytes = function(fromBytes) {
        var len = Math.max(fromBytes.byteLength + this.position, 
                           this.bytesAvailable);

        var new_ab = new ArrayBuffer(len);
        var from_ab = getDataFunc();

        // copy orig data
        var toArray = new Uint8Array(new_ab);
        var fromArray = new Uint8Array(from_ab);
        for (var i=0; i<fromArray.length; i++) {  
            toArray[i] = fromArray[i];
        }
        // copy new data
        var fromArray = new Uint8Array(fromBytes);
        var toArray = new Uint8Array(new_ab, this.position);
        for (var i=0; i<fromArray.length; i++) {  
            toArray[i] = fromArray[i];
        }
        // update stats
        this.position += fromArray.length;
        this.bytesAvailable = len;
        this.eof = (this.position == this.bytesAvailable) ? true : false;
        setDataFunc(new_ab);
    }

    this.close = function() {
    }

    // TODO:
    // fileStream.readBytes
    // fileStream.readBae64
    // fileStream.writeBase64
}

var File = function(options) {
    // File contructor options:
    //   - path
    //   - isFile
    //   - parent (if null, then root)
    //   - readOnly (optional, default to false)
    //   - modified (optional, default to now)

    this._add_file = function(file) {
        files.push(file);
    }

    var getPathName = function (pathString) {
        // e.g.: "Dir1/Dir2/File.txt/"
        // note, for fullPath, Dir1 == virtualRoot
        // { entirePath    : "Dir1/Dir2/File.txt"
        //   path          : "Dir1/Dir2"
        //   filename      : "File.txt"
        //   nextDir       : "Dir1/"
        //   remainingPath : "Dir2/File.txt"
        //
        // e.g.: "Dir1/"
        // { entirePath    : "Dir1"
        //   path          : ""
        //   filename      : "Dir1"
        //   nextDir       : "Dir1"
        //   remainingPath : ""

        var entirePath = "";
        var path = "";
        var filename = "";
        var nextDir= "";
        var remainingPath = "";
        
        // match only (filename)
        var re = /^([\w.\- %]+)\/?$/;
        var m = pathString.match(re);
        if (m) {
            entirePath = filename = nextDir = m[1];
            remainingPath = path = "";
        } else {
            // match (dir)(/more-dirs)/file
            re = /^([\w.\- %]+)(?:\/([\w.\- %\/]+))?\/([\w.\- %]+)\/?$/;
            m = pathString.match(re);
            if (m) {
                nextDir = m[1];
                entirePath = path = m[1];
                if (m[2] !== undefined) {
                    path += '\/' + m[2];
                    entirePath  = path;
                    remainingPath = m[2] + '\/';
                }
                entirePath = path + '\/' + m[3];
                filename = m[3];
                remainingPath += m[3];
            }
        }
        return { entirePath    : entirePath,
                 path          : path,
                 filename      : filename,
                 nextDir       : nextDir,
                 remainingPath : remainingPath };
    }

    this.fullPath = options.path;
    var p = getPathName(options.path);
    if (p.path) {
        this.path = p.path;
        this.name = p.filename;
    } else {
        this.path = p.filename;
        this.name = "";
    }

    this.readOnly = false;
    if (typeof options.readOnly === 'undefined') {
        this.readOnly = true;
    }

    this.modified = new Date();
    if (typeof options.modified === 'undefined') {
        this.modified = options.modified;
    }
 
    this.isFile = options.isFile;
    this.isDirectory = !this.isFile;
    if (this.isFile) {
        var data = new ArrayBuffer(0);
    } else {
        var files = [];
    }

    this.__defineGetter__("fileSize", function() {
        if (this.isFile) {
            return data.byteLength;
        } else {
            return undefined;
        }
    });

    this.__defineGetter__("length", function() {
        if (this.isFile) {
            return undefined;
        } else {
            return files.length;
        }
    });

    this.parent = options.parent;

    // TODO: add filter support
    this.listFiles = function(successCB, errorCB, filter) {
        if (this.isDirectory) {
            successCB(files);
        } else {
            errorCB( { name : 'NOT_SUPPORTED_ERR' });
        }
    }

    // TODO: add encoding support
    this.readAsText = function(successCB, errorCB, encoding) {
        if (this.isFile) {
            var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder ||
                              window.WebKitBlobBuilder;
            var bb = new BlobBuilder();
            bb.append(data);
            var f = new FileReader();
            f.onload = function(e) {
                successCB(e.target.result);
            }
            f.readAsText(bb.getBlob());

        } else {
            if (errorCB !== undefined) {
                errorCB('NOT_SUPPORTED_ERR');
            }
        }
    }

    var getVirtualRoot = function() {
        var parent = this.parent;
        while (parent !== null) {
            parent = parent.parent;
        }
        return parent;
    }

    this.resolve = function(pathString) {
        var p = getPathName(pathString);
        if (p) {
            var nextDirFullPath = this.fullPath + '/' + p.nextDir;
            var i=0;
            for (i=0; i<files.length; i++) {
                var file = files[i];
                if (file.fullPath == nextDirFullPath) {
                    if (p.remainingPath) {
                        // more to navigate into
                        try {
                            return file.resolve(p.remainingPath);
                        } catch (e) {
                            throw "File not found: " + p.remainingPath;
                        }
                    } else {
                        // no more; return
                        return file;
                    }
                }
            }
            if (i == files.length) {
                throw "File not found: " + nextDirFullPath;
            }
        } else {
            throw "Illegal filename: " + pathString;
        }
    }

    // TODO: check rw permissions
    // TODO: return err if exists already?
    this.createDirectory = function(pathString) {
        // enter each dir and create if needed; return deepest dir
        var p = getPathName(pathString);
        if (p) {
            var nextDir;
            var nextDirFullPath = this.fullPath + '/' + p.nextDir;
            try {
                nextDir = this.resolve(p.nextDir);
            } catch (e) {
                // TODO: check if error is cause dir doesn't exist versus ILL
                // create new dir if doesn't exist
                nextDir = new File( { path   : nextDirFullPath,
                                      isFile : false,
                                      parent : this} );
                files.push(nextDir);
            }
            if (p.remainingPath) {
                return nextDir.createDirectory(p.remainingPath);
            } else {
                return nextDir;
            }
        }
    }

    // TODO: check rw permissions
    this.createFile = function(pathString) {
        try {
            var file = this.resolve(pathString);
            throw "File exists: " + pathString;
        } catch (e) {
            // file doesn't exist
            var p = getPathName(pathString);
            if (p) {
                if (p.path) {
                    var dir;
                    // create dir if needed
                    try {
                        dir = this.createDirectory(p.path);
                    } catch (e) {
                        // ok if dir exists already
                        dir = this.resolve(p.path);
                    }
                } else {
                    dir = this;
                }
                // crete and add file
                var file = new File( { path: dir.fullPath + '/' + p.filename,
                                       isFile: true,
                                       parent: dir } );
                dir._add_file(file);
                return file;
            } else {
               throw "bad filename: " + pathString;
            }
        }
    }

    var setData = function(ab) {
        data = ab;
    }
    var getData = function() {
        return data;
    }

    // store data as ArrayBuffer this.data

    // TODO: encoding - add ascii, base64, hex
    // TODO: add r and a modes; assumes rw
    // TODO: assumes only one open handle
    this.openStream = function(openSuccessCB, errorCB, mode, encoding) {
        openSuccessCB(new FileStream(getData, setData));
    }

    this.toURI = function() {
        var URL = window.URL || window.webkitURL;
        var BlobBuilder = window.BlobBuilder || window.MozBlobBuilder ||
                          window.WebKitBlobBuilder;

        var bb = new BlobBuilder();
        bb.append(data);
        var blob = bb.getBlob();
        return URL.createObjectURL(blob);
    }

    //TODO:
    //file.copyTo
    //file.deleteDirectory
    //file.deleteFile
    //file.moveTo
}

var virtualRoots = { downloads: new File({ path   : 'downloads',
                                           isFile : false,
                                           parent : null}),
                     images   : new File({ path   : 'images',
                                           isFile : false,
                                           parent : null}),
                     podcasts : new File({ path   : 'podcasts',
                                           isFile : false,
                                           parent : null}),
                     music    : new File({ path   : 'music',
                                           isFile : false,
                                           parent : null}) };

var FileSystemModule = {
    maxPathLength: 255,
    resolve: function(resolveSuccessCB, errorCB, virtualRoot, modeString) {
        if (virtualRoots[virtualRoot] !== undefined) {
            resolveSuccessCB(virtualRoots[virtualRoot]);
        } else {
            errorCB({name: 'INVALID_VALUES_ERR'});
        }
    }
}

// ==========================================================================
// Screen Orientation emulation
// ==========================================================================

var ScreenOrientationModule = {
    lock: function(orientation){
        if ((orientation !== 'landscape') && (orientation !== 'portrait') && (orientation !== 'any')) {
            throw 'Invalid Parameter Provided';        
        }
        var container = document.getElementsByTagName('body')[0];

        if (orientation == "landscape")           
            console.log("Restricting orientation to landscape");
		else if (orientation == "portrait")
            console.log("Restricting orientation to portrait");
        else
            console.log("Restricting orientation to any");    
    }
}

// ==========================================================================
// loadModule emulation
// ==========================================================================

if (navigator.loadModule === undefined || navigator.loadModule.modules !== undefined) {
    console.log("Installing camera emulation");
	navigator.loadModule = function(module_name, successCB, failCB) {
        if (module_name == 'camera') {
            successCB(CameraModule);
        } else if (module_name == 'filesystem') {
            successCB(FileSystemModule);
        } else if (module_name == 'screenorientation') {
            successCB(ScreenOrientationModule);
        } else {
            failCB(module_name + " module not supported");
        }
    };
} else {
    console.log("Not installing camera emulation");
}

