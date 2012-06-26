from flask import Flask, g, request, render_template, url_for, abort, redirect
from pymongo import Connection
from bson.objectid import ObjectId
import logging, os
from datetime import datetime
from user import User

gconn = Connection()
app = Flask(__name__)
app.config.from_pyfile('config.py')

if app.debug:
    logging.basicConfig(level=logging.DEBUG)


def get_user():
    user_id = request.cookies.get('u')
    user = User.load(user_id)
    if not user:
        user = User.create()
    return user


def get_db():
    return gconn.geosnap


@app.before_request
def before_request():
    g.db = get_db()
    g.user = get_user()


@app.after_request
def after_request(resp):
    resp.set_cookie('u', g.user.id)
    return resp


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/create/start")
def create_start():
    challenge = {'create_ts': datetime.now(),
                 'user': g.user.id,
                 'solutions': []}
    id = g.db.challenges.insert(challenge, safe = True)
    return render_template("create_tour.html",
                           id = str(id))


@app.route("/create/<id>/<type>")
def take_picture(id, type):
    next_url = url_for('.get_geo', id=id)
    return render_template("take_picture.html",
                           id=id,
                           next_url = next_url,
                           upload_url = url_for('.upload', id=id, type=type))


@app.route("/create/<id>/geo")
def get_geo(id):
    return render_template("get_geo.html",
                           id=id)


@app.route("/create/<id>/done")
def create_done(id):
    return render_template("create_done.html", id=id)


@app.route("/set_geo/<id>", methods=["POST"])
def set_geo(id):
    c = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not c:
        abort(500)
    c['coords'] = [float(request.form['lat']), float(request.form['lon'])]
    g.db.challenges.save(c, safe=True)
    return redirect(url_for('.create_done', id=id))


@app.route("/upload/<id>/<type>", methods=["POST"])
def upload(id, type):
    filename = os.path.join(app.config['UPLOAD_FOLDER'], "%s-%s.jpg" % (id, type))
    open(filename, "wb").write(request.data)
    c = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not c:
        abort(500)
    c['pic_%s' % type] = {'fname': filename, 'ts': datetime.now()}
    g.db.challenges.save(c, safe=True)

    # When the first image is uploaded, associate the challenge with the user.
    g.user.add_challenge(id)
    return ""


if __name__ == "__main__":
    app.run(host='0.0.0.0', port = 8088, debug = True, threaded = True)
