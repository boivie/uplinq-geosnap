# GeoSnap!

GeoSnap! was an entry to the 2012 Uplinq Codefest hackathon. It's a simple game where one person creates photo challanges that another person should solve. The solver will be shown pictures from objects nearby that he should find.

It uses the Qualcomm HTML Camera API, Screen Orientation API and the HTML5 GeoLocation API.

## Installation Instructions

 - NOTE: You will need to have mongodb and python installed.

    $ sudo easy_install virtualenv  # if you don't have it already 
    $ virtualenv ENV
    $ . ENV/bin/activare
    $ pip install -r requirements.txt

## Running it

    $ . ENV/bin/activare
    $ python run.py

## License

All work is licensed under the Apache License, version 2.0. Please see LICENSE
for more information.
