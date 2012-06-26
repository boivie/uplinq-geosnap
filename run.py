from flask import Flask, g, request, render_template, url_for, abort
from flask import redirect, jsonify, send_file
from pymongo import Connection, GEO2D
from bson.objectid import ObjectId
import logging, os
from datetime import datetime
from user import User
from random import choice

gconn = Connection()
app = Flask(__name__)
app.config.from_pyfile('config.py')

if app.debug:
    logging.basicConfig(level=logging.DEBUG)


def get_lat(s):
    if (s == 'none'):
        s = '33.6389241'
    return float(s)


def get_lon(s):
    if (s == 'none'):
        s = '-84.43270009999999'
    return float(s)


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


@app.route("/solution/<id>")
def show_solution(id):
    solution = g.db.solutions.find_one({'_id': ObjectId(id)})
    if not solution:
        abort(404)
    challenge_id = str(solution['challenge'])
    print(challenge_id)
    return render_template("show_solution.html",
                           id = id,
                           cid = challenge_id,
                           correct = solution['correct'])


@app.route("/solution/<id>", methods=["POST"])
def create_solution(id):
    lat = get_lat(request.form['lat'])
    lon = get_lon(request.form['lon'])
    solution = {'challenge': ObjectId(id),
                'user': ObjectId(g.user.id),
                'ts': datetime.now(),
                'loc': [lat, lon],
                'correct': True}
    sid = g.db.solutions.insert(solution, safe=True)
    return jsonify(id = str(sid),
                   upload_url = url_for('.upload_solution', id=str(sid)),
                   solution_url = url_for('.show_solution', id=str(sid)))


@app.route("/claim/<id>", methods=["GET"])
def claim(id):
    return render_template("claim.html",
                           id = id)


@app.route("/create/start")
def create_start():
    challenge = {'create_ts': datetime.now(),
                 'user': g.user.id}
    id = g.db.challenges.insert(challenge, safe = True)
    return render_template("create_tour.html",
                           id = str(id))


@app.route("/find")
def find_challenges():
    return render_template("find_challenges.html")


@app.route("/hunt/<id>")
def hunt_challenge(id):
    doc = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not doc:
        abort(404)
    return render_template("hunt_challenge.html",
                           id=id)


@app.route("/challenge/<id>/image/<type>.jpeg")
def challenge_image(id, type):
    doc = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not doc:
        abort(404)
    f = open(doc['pic_%s' % type]['fname'])
    return send_file(f, mimetype='image/jpeg')


@app.route("/solution/<id>/image.jpeg")
def solution_image(id):
    doc = g.db.solutions.find_one({'_id': ObjectId(id)})
    if not doc:
        abort(404)
    f = open(doc['pic']['fname'])
    return send_file(f, mimetype='image/jpeg')


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


@app.route("/near.json")
def get_near():
    lat = get_lat(request.args['lat'])
    lon = get_lon(request.args['lon'])
    result = []
    for doc in g.db.challenges.find({'loc': {"$near": [lat, lon]}}).limit(10):
        result.append(str(doc['_id']))
    if len(result) == 0:
        return jsonify(error = 'No challenges nearby')
    id = choice(result)
    return jsonify(id = id,
                   url = url_for('.hunt_challenge', id=id))


@app.route("/create/<id>/done")
def create_done(id):
    return render_template("create_done.html", id=id)


@app.route("/set_geo/<id>", methods=["POST"])
def set_geo(id):
    c = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not c:
        abort(500)
    c['loc'] = [get_lat(request.form['lat']), get_lon(request.form['lon'])]
    g.db.challenges.save(c, safe=True)

    # It's complete
    g.user.add_challenge(id)
    return redirect(url_for('.create_done', id=id))


@app.route("/skip/<id>", methods=["POST"])
def skip_challenge(id):
    # NOTE: Does not actually skip it right now...
    return redirect(url_for('.find_challenges'))


@app.route("/upload/<id>/<type>", methods=["POST"])
def upload(id, type):
    filename = os.path.join(app.config['UPLOAD_FOLDER'], "%s-%s.jpg" % (id, type))
    open(filename, "wb").write(request.data)
    c = g.db.challenges.find_one({'_id': ObjectId(id)})
    if not c:
        abort(500)
    c['pic_%s' % type] = {'fname': filename, 'ts': datetime.now()}
    g.db.challenges.save(c, safe=True)
    return ""


@app.route("/solution-upload/<id>", methods=["POST"])
def upload_solution(id):
    solution = g.db.solutions.find_one({'_id': ObjectId(id)})
    if not solution:
        abort(404)
    challenge = str(solution['challenge'])
    filename = os.path.join(app.config['UPLOAD_FOLDER'], "%s-s-%s.jpg" % (challenge, id))
    open(filename, "wb").write(request.data)
    solution['pic'] = {'fname': filename, 'ts': datetime.now()}
    g.db.solutions.save(solution, safe=True)
    return ""


if __name__ == "__main__":
    get_db().challenges.ensure_index([("loc", GEO2D)])
    app.run(host='0.0.0.0', port = 8088, debug = True, threaded = True)
