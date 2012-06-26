from flask import g, request
from datetime import datetime
from bson.objectid import ObjectId


class User(object):
    def __init__(self, d):
        self.id = d['_id']
        self.cust_id = 0
        self.lang = d.get('lang')

    @classmethod
    def create(cls):
        d = {'ua': str(request.user_agent),
             'lang': None,
             'ip': request.remote_addr, 'ts': datetime.now()}
        d['_id'] = g.db.users.save(d)
        return User(d)

    @classmethod
    def load(cls, user_id):
        u = g.db.users.find_one({'_id': ObjectId(user_id)})
        if not u:
            return None
        return User(u)
