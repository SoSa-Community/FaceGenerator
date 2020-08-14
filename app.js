"use strict";
const fs  = require('fs');

const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');

const Buffer = require('buffer').Buffer;
const replaceColor = require('replace-color');
const Jimp = require('jimp');
const svg2img = require('svg2img');

const config = require('./config');

let express = require('express');
let app = express();

let images = {
    heads:  [null],
    ears:   [null],
    eyes:   [null],
    mouths: [null]
};


if(!fs.existsSync(`${config.imageFolder}`)){
    console.error('Image Folder Does Not Exist', `${config.imageFolder}`);
    process.exit();
}

if(!fs.existsSync(`${config.cacheFolder}`)){
    if(fs.mkdirSync(config.cacheFolder, {recursive: true})){
        console.warn('Cache Folder Created', `${config.cacheFolder}`);
    }else{
        console.error('Could not create or find Cache Folder', `${config.cacheFolder}`);
        process.exit();
    }
}


/** Initialize Face part arrays **/
for(let type in images){
    let array = [];

    if(!fs.existsSync(`${config.imageFolder}${type}`)){
        console.error('Required Folder Does Not Exist', `${config.imageFolder}${type}`);
        process.exit();
    }

    fs.readdirSync(`${config.imageFolder}${type}`).forEach(file => {
        const fileSplit = file.split('.');
        const fileType = fileSplit.pop().toLowerCase();
        const path = `${config.imageFolder}${type}/${file}`;

        array.push({
                name: fileSplit.join('.'),
                path,
                type: fileType,
                buffer: fs.readFileSync(path)
        });
    });

    array.sort((a, b) => parseInt(a.name.replace(/[^0-9]+/,'')) - parseInt(b.name.replace(/[^0-9]+/,'')));
    array.unshift(null);
    images[type] = array;
}

app.get(['/generate', '/generate/*'], (req, res) => {
    let head, eyes, mouth, ears, backgroundColor, faceColor =  null;
    let returnType = 'default';

    /**
     * Split the params by / and then by -
     * EG:
     * http://localhost/generate/head-1/eyes-2/mouth-3/ears-4/backgroundColor-2b2b2b/faceColor-888ea8/returnType-image
     *
     * We use '-' instead of = to ensure a URL can be cached and re-used and doesn't
     * conflict with normal parsing of url strings
     */
    if(req.params && typeof req.params[0] === 'string'){
        req.params[0].split('/').forEach((param) => {
            let [part, value] = param.split('-');

            if(part && value){
                switch(part){
                    case 'head': head = value; break;
                    case 'eyes': eyes = value; break;
                    case 'mouth': mouth = value; break;
                    case 'ears': ears = value; break;
                    case 'backgroundColor': backgroundColor = value; break;
                    case 'faceColor': faceColor = value; break;
                    case 'returnType': returnType = value; break;
                }
            }
        });
    }

    const cleanValue = (value, max) => {
        if(typeof(value) !== 'string') return Math.floor(Math.random() * Math.floor(max)) + 1;
        return parseInt(value.replace(/[^0-9]+/,''));
    };

    head = cleanValue(head, images.heads.length - 1);
    eyes = cleanValue(eyes, images.eyes.length - 1);
    mouth = cleanValue(mouth, images.mouths.length - 1);
    ears = cleanValue(ears, images.ears.length - 1);

    generateBotFace((name, head, eyes, mouth, ears, backgroundColor, faceColor, filePath, image) => {
        const fullURL = `${config.url}/${config.staticResource}/${filePath}`;
        switch(returnType){
            case 'image':
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': image.length
                });
                res.end(image);
                break;
            case 'json': res.json({name, head, eyes, mouth, ears, backgroundColor, faceColor, url:fullURL}); break;
            default:
                res.redirect(fullURL);
        }
    }, head, eyes, mouth, ears, backgroundColor, faceColor);
});

if(fs.existsSync(config.publicFolder)){
    app.use(express.static(config.publicFolder));
}else{
    console.warn('Public Folder Does Not Exist, the server will still start but you won\'t be able to server a website from here');
}

app.use(`/${config.staticResource}`, express.static('cache/static'));
app.listen(config.port, () => console.log(`Listening on ${config.url}:${config.port}`));

/**
 * @callback GenerationCallback
 * @param {String} name - Name of the generated face
 * @param {Number} head - Index of the head used
 * @param {Number} eyes - Index of the eyes used
 * @param {Number} mouth - Index of the mouth used
 * @param {Number} ears - Index of the ears used
 * @param {String} backgroundColor - HTML hex code to used for the background
 * @param {String} faceColor - HTML Hex code (or 'transparent') used as the face colour
 * @param {String} filePath - File path to the generated face
 * @param {Buffer} image - Buffer representing the generated face
 */

/**
 * Method to generate our face, write to a file and then call the callback
 *
 * @param {GenerationCallback} callback
 * @param {Number} head - Index of the head to use
 * @param {Number} eyes - Index of the eyes to use
 * @param {Number} mouth - Index of the mouth to use
 * @param {Number} ears - Index of the ears to use
 * @param {String} backgroundColor - HTML hex code to use as the background, default set in config
 * @param {String} faceColor - HTML Hex code to use as the face colour, default is transparent
 */
function generateBotFace(callback, head, eyes, mouth, ears, backgroundColor, faceColor){

    let array = [];
    if(images.eyes[eyes]) array.push(images.eyes[eyes]);
    if(images.mouths[mouth]) array.push(images.mouths[mouth]);
    if(images.ears[ears]) array.push(images.ears[ears]);

    /** Generate Face name **/
    let name = `${config.names[0][head]}${config.names[1][eyes]}${config.names[2][mouth]}${config.names[3][ears]}`;

    /** Check that background colour is a valid hex code otherwise set it to default **/
    if(typeof(backgroundColor) !== 'string' || !/^[0-9A-F]{6}$/i.test(backgroundColor)) backgroundColor = config.defaultBackground;

    /** Check that faceColor is a valid hex code otherwise set it to default **/
    if(typeof(faceColor) !== 'string' || !/^[0-9A-F]{6}$/i.test(faceColor)){
        faceColor = 'transparent';
    }else{
        faceColor = `#${faceColor}`;
    }

    const cacheFolder = `${backgroundColor.toLowerCase()}/${faceColor.replace(/#/,'')}`;
    const cacheFullPath = `${config.cacheFolder}static/${cacheFolder}`;
    const cacheFilename = `${cacheFullPath}/${name}.png`;

    const handleCallback = (image) => {
        try{
            callback(name, head, eyes, mouth, ears, backgroundColor, faceColor, `${cacheFolder}/${name}.png`, image);
        }catch(e){
            console.debug(e);
        }
    };

    /** Check to see if the cache file already exists for the selected options **/
    fs.exists(cacheFilename, (exists) => {
        if(exists) {
            /** If it exists, return it instead of generating a new one **/
            fs.readFile(cacheFilename, (err, img) => handleCallback(img));
        }else{

            /**
             * This function is triggered after we've done our processing below.
             *
             * Merge the layers with the head canvas, write to our cache and then trigger the callback
             * @param headImage
             * @param faceImage
             */
            const doMerge = (headImage, faceImage) => {
                let filesToMerge = array.map(image => image.buffer);

                if(headImage !== null) filesToMerge.unshift(headImage);
                if(faceImage !== null) filesToMerge.unshift(faceImage);

                mergeImages(filesToMerge, {Canvas: Canvas, Image: Image}).then((b64) => {
                    let base64Image = b64.split(';base64,').pop();
                    const img = Buffer.from(base64Image, 'base64');

                    fs.mkdir(cacheFullPath, {recursive: true}, () => {
                        fs.writeFile(cacheFilename, img, () => handleCallback(img));
                    });
                });
            };

            let headImage = images.heads[head];
            /**
             * Check to see if our Head Image is a SVG file,
             * if it is, we can do a simple string replace instead of changing pixel by pixel
             * **/
            if(headImage.type === 'svg'){
                let svgString = headImage.buffer.toString('utf8');
                svgString = svgString.replace('rgb(255,0,255)',`#${backgroundColor}`);
                svgString = svgString.replace('rgb(255,1,255)',`${faceColor}`);

                svg2img(svgString, {'width':config.assetWidth, 'height': config.assetHeight, preserveAspectRatio:true}, function(error, buffer) {
                    doMerge(buffer, null);
                });
            }else{
                /**
                 * If we won't have a SVG file, we have to fallback to the slower find and replace method
                 * to speed this process up, we use a file cache.
                 *
                 * If the cache file doesn't exist, generate a new canvas for the requested face colour
                 * we maintain a transparent background on our "face" template for flexibility reasons
                 */
                new Jimp(config.assetWidth, config.assetHeight, faceColor, (err, faceCanvas) => {
                    faceCanvas.getBuffer(Jimp.MIME_PNG, (err, faceColorImage) => {
                        /**
                         * To allow the background to be changed (as well as the face background)
                         * we set the head background to #ff00ff so that we can use it as a "green screen"
                         * Color replacement can be a little slow so to speed things up - we cache the heads once they've been
                         * processed for future use.
                         */
                        const headFile = `./cache/heads/head-${head}-${backgroundColor}.png`;

                        fs.exists(headFile, (exists) => {
                            /** If we find a head cache file,  go ahead and merge it with the other parts **/
                            if(exists){
                                doMerge(headFile, faceColorImage);
                            }else{
                                /**
                                 * If we can't find a head cache file, we need to replace the greenscreen with our
                                 * chosen colour and then write it to the cache for future use.
                                 *
                                 * Then we merge!
                                 */

                                replaceColor({
                                    image: headImage.buffer,
                                    colors: {
                                        type: 'hex',
                                        targetColor: config.headGreenScreenColor,
                                        replaceColor: `#${backgroundColor}`
                                    },
                                    deltaE: 30
                                }).then(jimpObject => {
                                    jimpObject.write(headFile, (err, backgroundColor) => {
                                        doMerge(headFile, faceColorImage);
                                    });
                                });

                            }
                        });
                    });
                });
            }


        }
    });
}
