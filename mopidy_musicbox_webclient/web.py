import json
import logging
import socket
import string
import urllib.parse

import tornado.web

import mopidy_musicbox_webclient.webclient as mmw

logger = logging.getLogger(__name__)


class StaticHandler(tornado.web.StaticFileHandler):
    def get(self, path, *args, **kwargs):
        #print("StaticHandler")
        version = self.get_argument("v", None)
        if version:
            logger.debug("Get static resource for %s?v=%s", path, version)
        else:
            logger.debug("Get static resource for %s", path)
        return super().get(path, *args, **kwargs)

    @classmethod
    def get_version(cls, settings, path):
        return mmw.Extension.version

class PartyRequestHandler(tornado.web.RequestHandler):

    def initialize(self, core, data, config):
        #print("PartyRequestHandler")
        self.core = core
        self.data = data
        self.requiredVotes = config["musicbox_webclient"]["votes_to_skip"]
        requiredVotes = str(self.requiredVotes)
        printData = str(self.data)
        #print("initalized")
        #print("required votes " + requiredVotes)
        #print("self.data = " + printData)
        ip = self.request.remote_ip
        #print(ip)

    def get(self, *args):
        currentTrack = self.core.playback.get_current_track().get()
        printTrack = str(currentTrack)
        #print("current Track is " + printTrack)
        
        if (currentTrack == None): 
            self.write("Add some songs to the queue...idiot")
            return
        currentTrackURI = currentTrack.uri


        # If the current track is different to the one stored, clear votes
        if (currentTrackURI != self.data["track"]):
            self.data["track"] = currentTrackURI
            self.data["votes"] = []
            #print("Cleared Votes")

        if (self.request.remote_ip in self.data["votes"]): # User has already voted
            self.write("You have already voted to skip this song =)")
            #print("User already voted")
        else: # Valid vote
            self.data["votes"].append(self.request.remote_ip)
            if (len(self.data["votes"]) == self.requiredVotes):
                self.core.playback.next()
                self.write("Skipping...")
                #print("Skipping")
            else:
                self.write("You have voted to skip this song. ("+str(self.requiredVotes-len(self.data["votes"]))+" more vote(s) needed)")
                #print("need more votes")



class IndexHandler(tornado.web.RequestHandler):
    def initialize(self, config, path):
        #print("IndexHandler")


        webclient = mmw.Webclient(config)

        if webclient.is_music_box():
            program_name = "MusicBox"
        else:
            program_name = "Mopidy"

        url = urllib.parse.urlparse(
            f"{self.request.protocol}://{self.request.host}"
        )
        port = url.port or 80
        try:
            ip = socket.getaddrinfo(url.hostname, port)[0][4][0]
        except Exception:
            ip = url.hostname

        self.__dict = {
            "isMusicBox": json.dumps(webclient.is_music_box()),
            "websocketUrl": webclient.get_websocket_url(self.request),
            "hasAlarmClock": json.dumps(webclient.has_alarm_clock()),
            "onTrackClick": webclient.get_default_click_action(),
            "programName": program_name,
            "hostname": url.hostname,
            "serverIP": ip,
            "serverPort": port,
        }
        self.__path = path
        self.__title = string.Template(f"{program_name} on $hostname")

    def get(self, path):
        return self.render(path, title=self.get_title(), **self.__dict)

    def get_title(self):
        url = urllib.parse.urlparse(
            f"{self.request.protocol}://{self.request.host}"
        )
        return self.__title.safe_substitute(hostname=url.hostname)

    def get_template_path(self):
        return self.__path
