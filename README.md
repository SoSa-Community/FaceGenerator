# FaceGenerator
The point of this software is to provide an API that allows for the random generation of faces for use on https://sosa.net.

But because I love you all, i've also decided to make it open source :) 

## How to get running
```
git clone git@github.com:SoSa-Community/FaceGenerator.git
cd FaceGenerator
cp config.example.js config.js
```

Make sure you set the appropriate options your newly created `config.js`

| Option  | Description | Example Values | Default |
|---------|-------------|----------------|---------|
|port     | Port number you want to start the server on | `80`,`443`,`300` | `80`|
|url      | The full url of where this server is running without trailing slash | `https://botface.io` | `http://localhost` |
|cacheFolder     | Full / Relative folder path to the cache folder | `./cache/` | `./cache/` |
|imageFolder     | Full / Relative folder path to the image asset folder | `./images/` | `./images/` |
|publicFolder    | Full / Relative folder path to the public asset folder, you only need this if you're running your homepage from here too | `./public/` | `./public/` |
|staticResource  | Resource to serve cached face's from eg for https://botface.io/faces, set this to `faces` | `faces`, `bots`, `images` | `face` |
|assetWidth     | Number representing the width of the image assets | `1000` | `1000` |
|assetHeight     | Number representing the height of the image assets | `1000` | `1000` |
|headGreenScreenColor     | This should be set to the background colour on the head assets | `#ff00ff` | `#ff00ff` |
|defaultBackground | The default background hex code applied to each generated face | Any Hexcode without the # | `2b2b2b` |

You will need to create your `imageFolder` along with subfolders containing each of your images.
The expected structure is
```
    images
        ├── .
        ├── ..
        ├── ears
            ├── 1.png
            ├── 2.png
            └── 3.png    
        ├── eyes
            ├── 1.png
            ├── 2.png
            └── 3.png
        ├── heads
            ├── 1.png
            ├── 2.png
            └── 3.png
        └── mouths
            ├── 1.png
            ├── 2.png
            └── 3.png
```    

If these don't exist - it won't be able to generate the faces!
Have fun!

#Run
```
node .
```

