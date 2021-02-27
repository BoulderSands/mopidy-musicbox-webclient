import pathlib
import os

import pkg_resources

import tornado.web

from mopidy import config, ext

__version__ = pkg_resources.get_distribution(
    "Mopidy-MusicBox-Webclient"
).version


def factory(config, core):
    from tornado.web import RedirectHandler
    from .web import IndexHandler, StaticHandler, PartyRequestHandler, ShutdownHandler, RestartHandler

    path = pathlib.Path(__file__).parent / "static"
    data = {'track':"", 'votes':[]}
    print("Normal Factory")
    
    
    return [
        (r"/", RedirectHandler, {"url": "index.html"}),
        (r"/(index.html)", IndexHandler, {"config": config, "path": path}),
        (r"/skip", PartyRequestHandler, {'core': core, 'data':data, 'config':config}), #added for vote to skip feature
        (r"/shutdown", ShutdownHandler), #added for shutdown feature
        (r"/restart", RestartHandler), #added for restart feature
        (r"/(.*)", StaticHandler, {"path": path})

    ]

class Extension(ext.Extension):

    dist_name = "Mopidy-MusicBox-Webclient"
    ext_name = "musicbox_webclient"
    version = __version__

    def get_default_config(self):
        conf_file = os.path.join(os.path.dirname(__file__), 'ext.conf')
        return config.read(conf_file)

    def get_config_schema(self):
        schema = super(Extension, self).get_config_schema()
        schema['votes_to_skip'] = config.Integer(minimum=0)
        schema["musicbox"] = config.Boolean(optional=True)
        schema["websocket_host"] = config.Hostname(optional=True)
        schema["websocket_port"] = config.Port(optional=True)
        schema["on_track_click"] = config.String(
            optional=True,
            choices=[
                "PLAY_NOW",
                "PLAY_NEXT",
                "ADD_THIS_BOTTOM",
                "ADD_ALL_BOTTOM",
                "PLAY_ALL",
                "DYNAMIC",
            ],
        )
        return schema

    def setup(self, registry):
        registry.add('http:static', {
            'name': self.ext_name,
            'path': os.path.join(os.path.dirname(__file__), 'static'),
        })
        registry.add(
            "http:app", {"name": self.ext_name, "factory": factory}
        )
        print("everytime?!")

