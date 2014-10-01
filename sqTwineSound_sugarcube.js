//    sqTwineSound HTML5 Sound Macro Suite
//    Copyright 2014 Tory Hoke
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
//     http://www.sub-q.com
//     @toryhoke
//
//     Download/Documentation
//         https://github.com/AteYourLembas/sqTwineSound
//
//     FAQ / Q & A
//         http://sub-q.com/stackfauxchange
//
//     Feature Requests
//         http://sub-q.com/forum/features
//
//
// This suite based on Twine: HTML5 sound macros 
// by Leon Arnott of Glorious Trainwrecks
// the content and influence of which appear
// under a Creative Commons CC0 1.0 Universal License
//     http://www.glorioustrainwrecks.com/node/5061
//
//
// If this JavaScript code is minimized, you're probably not reading this.
// Even so, here is the tool that makes code beautiful again:
//     http://jsbeautifier.org
//
// If you're getting ready to use this script and want it minimized
// for download efficiency:
//     http://jscompress.com/
//
// If you're making changes to this script and want to check it
// for common errors:
//     http://jshint.com/
//
//
//
// This suite contains the following macros
//
//     playsound, playsounds, updatevolume,
//     pausesound, pauseallsound, 
//     stopsound, stopallsound
//     loopsound, unloopsound
//     fadeinsound, fadeinsounds, fadeoutsound, fadeoutsounds
//     quieter, louder
//     jumpscare
//
//     PLEASE GIVE YOUR READER A STARTLE WARNING BEFORE USING JUMPSCARE!
//
//
//

(function () {
    version.extensions.soundMacros = {
        major: 0,
        minor: 8,
        revision: 0
    };

    var globalVolume = 1.0;
    var updateInterval = 10; //Update sound volume, etc. once every 10 ms
    var minVolume = 0.01; // Minimum possible volume -- 0 is mute, so we want somethings slightly above that
    var soundInterval = 0.1; // Creates an interval of 1/10 creates ten stages of loudness. Used by quieter/louder. Feel free to tweak
    var fileExtensions = ["ogg", "mp3", "wav", "webm"]; // Acceptable file extensions for audio
    var clips = {};


    //------------- pausableTimeout ---------
    //--------------------------------------
    function pausableTimeout(func, params) {

      this.funcToRun = func;
      this.waitStartTime = -1;
      this.waitEndTime = -1;
      this.waitDuration = -1;

      this.activate = function(waitDuration) {

        if (this.pausedAt !== undefined) { this.waitDuration = this.timeRemaining(); }
        else if (waitDuration !== undefined) this.waitDuration = waitDuration;
        else if (this.waitDuration > -1 ) { console.log("Warning: No wait duration given to pausableTimeout. Using last specified one."); }
        else return; // Don't bother to start a loop with no wait duration

        this.waitStartTime = new Date().getTime();
        this.waitEndTime = new Date().getTime() + this.waitDuration;
        this.timeout = setTimeout(this.funcToRun, this.waitDuration, params);
      };

      this.deactivate = function() {
        this.pausedAt = this.timeElapsed();
        if (this.timeout !== undefined) clearTimeout(this.timeout);
      };

      this.stopAndClear = function() {
        if (this.pausedAt !== undefined) delete this.pausedAt;
        if (this.timeout !== undefined) { clearTimeout(this.timeout); delete this.timeout; }
      };

      this.timeElapsed = function() {
        return new Date().getTime() - this.waitStartTime;
      };

      this.timeRemaining = function() {
        if (this.pausedAt !== undefined) return this.waitDuration - this.pausedAt;
        return this.waitEndTime - new Date().getTime();
      };
    }
    //------------- /pausableTimeout --------
    //--------------------------------------


    //------------- sqAudio ----------------
    //--------------------------------------
    function sqAudio(clipName, fileExt) {

        this.clipName = clipName; // Let a clip know its own name
        this.fileExt = fileExt;

        // Defaults
        this.volumeProportion = 1.0; // By default, full volume
        this.overlap = 1000; // By default, 1000 ms (1 second)
        this.isPlayable = false; // Assume audio is not playable
        this.looping = false; // Assume audio not looping
        this.alternate = false;
        this.mainAudio = new Audio();
        this.partnerAudio = new Audio();

        this.mainAudio.setAttribute("src", this.clipName + "." + this.fileExt);
        if (this.mainAudio.canPlayType) {
            for (var i = -1; i < fileExtensions.length; i += 1) {
                if (i >= 0) fileExt = fileExtensions[i];
                if (this.mainAudio.canPlayType("audio/" + fileExt)) break;
            }
            if (i < fileExtensions.length) {
                this.mainAudio.interval = null;
                this.partnerAudio.setAttribute("src", this.clipName + "." + this.fileExt);
                this.partnerAudio.interval = null;
                this.isPlayable = true;

            } else {
              console.log("Browser can't play '" + this.clipName + "'");
            }
        }   

        // Convenience method for getting duration
        // TODO : protect this against audio not being loaded yet
        //
        this.getDuration = function () {
            return this.mainAudio.duration;
        };

        // Get what we consider the current audio track
        //
        this._getActiveAudio = function() {
          return (this.alternate) ? this.partnerAudio : this.mainAudio;
        };

        // Get what we consider the idle audio track
        //
        this._getIdleAudio = function() {
          return (this.alternate) ? this.mainAudio : this.partnerAudio;
        };


        // Perform fade on specified audio
        //
        this.__fadeSound = function(audioObj, fadeIn) {

          var goalVolume = globalVolume * this.volumeProportion;
          var tempVolume = audioObj.volume;
          var increment = ((goalVolume * updateInterval) / this.overlap) * (fadeIn ? 1 : -1);

          audioObj.interval = setInterval(function() {

              // If you ever want to start/end at a volume other than zero, change goalVolume in the line below to be abs(goalVolume-startVolume) or some such
              //
              tempVolume = Math.min(goalVolume, Math.max(0, tempVolume + increment));

              //Easing (increment, startpoint, endpoint) chooses the next friendly value between the given min and max; prevents sound popping in or out
              //
              audioObj.volume = Math.easeInOut(tempVolume, 0, goalVolume); 
            
              if (tempVolume === 0 || tempVolume === goalVolume) clearInterval(audioObj.interval);

              //This effectively stops the loop and poises the volume to be played again
              //That way the clip isn't needlessly looping when no one can hear it.
              if (tempVolume === 0) {
                  audioObj.pause();
                  audioObj.currentTime = 0;
                  // This is usually redundant, as playsound() adjusts the volume before playing, but better safe than sorry.
                  audioObj.volume = goalVolume;
              }
          }, updateInterval);
        };


        // Manages starting one loop before the last play has ended
        // and cross-fading the ends
        //
        this._crossfadeLoop = function(params) {

          var sqAudioObj = params[0];
          var currAudioObj = params[1];

          // Let loop expire if no longer looping
          //
          if (!sqAudioObj.looping) { return; }

          var nextAudioObj = sqAudioObj.alternate ? sqAudioObj.mainAudio : sqAudioObj.partnerAudio;
          sqAudioObj.alternate = !sqAudioObj.alternate;

          // fade out current sound
          //
          sqAudioObj.__fadeSound(currAudioObj, false);

          // And fade in our partner
          //
          nextAudioObj.currentTime = 0;
          nextAudioObj.volume = globalVolume * sqAudioObj.volumeProportion;
          nextAudioObj.play();       
          sqAudioObj.__fadeSound(nextAudioObj, true);

          // Kick off the next timer to crossfade
          // Might as well garbage collect the old crossfadeTimeout, too.
          //
          if (sqAudioObj.crossfadeTimeout !== undefined) { sqAudioObj.crossfadeTimeout.stopAndClear(); delete sqAudioObj.crossfadeTimeout; }
          if (isNaN(sqAudioObj.getDuration())) { this.error("Can't loop because duration is not known (audio not loaded, probably not found.)"); return; }
          sqAudioObj.crossfadeTimeout = new pausableTimeout(sqAudioObj._crossfadeLoop, [sqAudioObj, nextAudioObj]); 
          sqAudioObj.crossfadeTimeout.activate(sqAudioObj.getDuration()*1000-sqAudioObj.overlap);

        };


        this._fadeSound = function(activeAudioObj, fadeIn) {

          // Set the goal volume as a proportion of the global volume
          // (e.g. if global volume is 0.4, and volume proportion is 0.25, overall the goal volume is 0.1)
          //
          var goalVolume = globalVolume * this.volumeProportion;
          if (activeAudioObj.interval) clearInterval(activeAudioObj.interval);
          if (fadeIn) {
              if (activeAudioObj.currentTime > 0) activeAudioObj.currentTime = 0;
              activeAudioObj.volume = 0;  
              this.loop();

          } else {

              if (!activeAudioObj.currentTime) return;
              activeAudioObj.volume = goalVolume;
              activeAudioObj.play();
          }
          this.__fadeSound(activeAudioObj, fadeIn);

        };


        // Fade sound on whatever the active audio is
        //
        this.fadeSound = function(fadeIn) {
            if (fadeIn) this.stopAndClear();
            else this.looping = false;
            this._fadeSound(this._getActiveAudio(), fadeIn);
        };

        // Update volume proportion and volume of both audio clips
        //
        this.updateVolumeProportion = function(volumeProportion) {
            this.volumeProportion = volumeProportion;
            this.updateVolume();
        };

        // Update volume of both audio clips (assumes vol proportion and global vol already set)
        //
        this.updateVolume = function() {
            this.mainAudio.volume = this.partnerAudio.volume = globalVolume * this.volumeProportion;
        };

        // Play the current audio object and reactivate any paused timer
        //
        this.play = function(loop) {

          //If it's a loop we want, just loop and don't make a big deal out of it
          if (loop) this.loop();

          else {

            var activeAudioObj = this._getActiveAudio();
            if (activeAudioObj) {  
                this.updateVolume();
                activeAudioObj.play();
              }
          }
        };

        // Pause whatever audio is currently playing and pause the timer, too
        //
        this.pause = function() {
          this._getActiveAudio().pause();
          if (this.crossfadeTimeout !== undefined) this.crossfadeTimeout.deactivate();
        };

        // Stop whatever audio is currently playing and dump the timer
        //
        this.stopAndClear = function() {
          var activeAudioObj = this._getActiveAudio();
          activeAudioObj.pause();
          if (activeAudioObj.currentTime) activeAudioObj.currentTime = 0;
          if (this.crossfadeTimeout !== undefined) { this.crossfadeTimeout.stopAndClear(); delete this.crossfadeTimeout; }
        };


        // Loop the track
        //
        this.loop = function() {

            this.looping = true;
            var activeAudioObj = this._getActiveAudio();

            // Create new timeout if one does not already exist; otherwise just reuse the existing one
            //
            this.crossfadeTimeout = (this.crossfadeTimeout === undefined) ? new pausableTimeout(this._crossfadeLoop, [this, activeAudioObj]) : this.crossfadeTimeout; 
            if (isNaN(this.getDuration())) { this.error("Can't loop because duration is not known (audio not loaded, probably not found.)"); return; }
            this.crossfadeTimeout.activate((this.getDuration()*1000)-this.overlap);
            activeAudioObj.play();
        };


    }
    //------------ /sqAudio ----------------
    //--------------------------------------



    /***********************************************************
    *   MAIN METHOD
    /***********************************************************
    /
    /  Here be monsters. Proceed with caution.
    /
    */

    // Verify that the audio can be played in browser
    //
    function parseAudio(c, e) {

        var d = c.exec(div.innerHTML); // returns list of form ["accordion.mp3",accordion,mp3]

        while(d) {
            if (d) {

                if (!clips.hasOwnProperty(d[1])) {
                  var sqAudioObj = new sqAudio(d[1].toString(), d[2].toString());
                  if (sqAudioObj.isPlayable) clips[d[1].toString()] = sqAudioObj;
                }
            }
            d = c.exec(div.innerHTML); // yes, we could just do a do/while, but some envs don't like that
        }
    }

    // Parse all used audio file names
    // Use whatever store area element is available in the story format
    //
    var storeElement = (document.getElementById("store-area") ? document.getElementById("store-area") : document.getElementById("storeArea"));
    var div = storeElement.firstChild;
    while (div) {
        var b = String.fromCharCode(92);
        var q = '"';
        var re = "['" + q + "]([^" + q + "']*?)" + b + ".(" + fileExtensions.join("|") + ")['" + q + "]";
        parseAudio(new RegExp(re, "gi"));
        div = div.nextSibling;
    }
    /***********************************************************
    *   END MAIN METHOD
    /***********************************************************/



    /***********************************************************
    *   SUPPORTING FUNCTIONS FOR THE MACROS
    /***********************************************************
    /
    /  Here be monsters. Proceed with caution.
    /
    */

    // Given the clipName, get the active soundtrack
    //
    function getSoundTrack(clipName) {
        clipName = clipName.toString();
        clipName = clipName.lastIndexOf(".") > -1 ? clipName.slice(0, clipName.lastIndexOf(".")) : clipName;
        return clips[clipName];
    }

    
    // Centralized function for fading multiple sounds
    //
    function loopSounds(loopNameString, fadeIn, volumeProportion, overlap) {

        // loopNameString will be an object like "some.mp3,this.mp3"
        // Convert to a string and break into pieces
        // Don't bother converting to audio clip at this point--
        // the call to fadeSound() will take care of that
        //
        var loopNames = loopNameString.split(",");
        for (var index in loopNames) {
          if (loopNames.hasOwnProperty(index)) {
              var loopName = loopNames[index];
              loopName = loopName.lastIndexOf(".") > -1 ? loopName.slice(0, loopName.lastIndexOf(".")) : loopName;

              if (volumeProportion !== undefined) this.getSoundTrack(loopName).updateVolumeProportion(volumeProportion);
              if (overlap !== undefined) this.getSoundTrack(loopName).overlap = overlap;

              if (fadeIn) fadeSound(this.getSoundTrack(loopName));
              else this.getSoundTrack(loopName).loop();
          }
        }
    }


    // Centralized function for sound fading
    //
    function fadeSound(clipName, fadeIn) {

      var soundtrack = getSoundTrack(clipName);
      if (soundtrack === "undefined") { return this.error("audio clip " + clipName + " not found"); } 
      soundtrack.fadeSound(fadeIn);
      
    }


    // Adjust the volume of ALL audio in the page
    //
    function adjustVolume(direction) {

        // Note soundInterval and minVolume are declared globally (at top of the script)
        var maxVolume = 1.0; // This is native to JavaScript. Changing will cause unexpected behavior
        globalVolume = Math.max(minVolume, Math.min(maxVolume, globalVolume + (soundInterval * direction)));

        for (var soundIndex in clips) {
            if (clips.hasOwnProperty(soundIndex)) {
                clips[soundIndex].updateVolume();
            }
        }
    }

    // Common argument management
    //
    function manageTripleArgs(func) {
          if (func.args.length < 1) { return func.error("no audio clip name specified"); }    
          if (func.args.length > 1) { 
            if (typeof func.args[1] == "number") {
              if (func.args[1] > 1.0 || func.args[1] < 0.0) { return func.error("Volume proportion (second argument) must be a decimal number no smaller than 0.0 and no bigger than 1.0"); }
            } else { return func.error("Volume proportion (second argument) must be a decimal number (between 0.0 and 1.0)"); }
          }
          if (func.args.length > 2) { 
            if (typeof func.args[2] !== "number") { return func.error("Fade duration (third argument) must be a number indicating milliseconds (defaults to 1000 ms aka 1 second)"); }
          } 
          if (func.args.length > 3) { 
            if (typeof func.args[3] !== "boolean") { return func.error("Whether to loop (fourth argument) must be a boolean (true or false)"); }
          } 
    }


  /***********************************************************
  *   END SUPPORTING FUNCTIONS FOR THE MACROS
  /***********************************************************/



  /***********************************************************
  /***********************************************************
  *   MACROS
  /***********************************************************
  /***********************************************************
  */

    /* <<updatevolume $backgroundMusic 0.5>>
    /
    / Given a decimal between 0.0 and 1.0, 
    / updates the clip's volume proportion and the clip's actual volume
    /
    */
    macros.add("updatevolume", {
        handler: function () {
          
          if (this.args.length < 2) {
            var errors = [];
            if (this.args.length < 1) { errors.push("audio clip name"); }
            if (this.args.length < 2) { errors.push("volume proportion"); }
            return this.error("no " + errors.join(" or ") + " specified");
          }
          if (typeof this.args[1] == "number") {
            if (this.args[1] > 1.0 || this.args[1] < 0.0) { return this.error("Volume proportion (second argument) must be a decimal number no smaller than 0.0 and no bigger than 1.0"); }
          } else { return this.error("Volume proportion (second argument) must be a decimal number (between 0.0 and 1.0)"); }
          
          var loopName = this.args[0].toString();
          var volumeProportion = parseFloat(this.args[1]);
          var clipName = loopName.lastIndexOf(".") > -1 ? loopName.slice(0, loopName.lastIndexOf(".")) : loopName;

          clips[clipName].updateVolumeProportion(volumeProportion);
        }
    });

    /**
     * <<playsound "meow.mp3">> OR <<playsound "meow" 0.8>> OR <<playsound $meow 0.8 true>> OR <<playsound $meow 0.8 true 200>>
     *
     *  This version of the macro lets you do a little bit of sound mixing.
     *
     *  This macro requires a sound clip name
     *
     *  In addition, you may give it (in this order, please)
     *
     *  OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
     *  OPTIONAL: number of milliseconds to overlap/crossfade the loop (1000 ms aka 1 sec by default)
     *  OPTIONAL: true if you'd like to loop, false if no
     *
     #  So this plays a clip normally, at full global volume
     *
     *      <<playsound $walla">>
     *
     *  OR this fades in a quiet background $walla that will loop and crossfade with 2000 ms (2 seconds) of overlap:
     *
     *      <<playsound $walla 0.2 2000 true>>
     *
     *  And this plays a louder $meow on top:
     *
     *      <<playsound $meow 1.0>>
     *
     *
     */
    macros.add("playsound", {
      handler : function () {

          manageTripleArgs(this);

          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = this.args.length > 1 ? this.args[1] : soundtrack.volumeProportion;
          var loop = this.args.length > 3 ? this.args[3] : false;
          soundtrack.overlap = this.args.length > 2 ? parseInt(this.args[2]) : 0;
          soundtrack.updateVolumeProportion(volumeProportion);
          soundtrack.play(loop); 
        }
    });


    /* <<playsounds ["moodMusic.mp3", "footsteps.mp3"]>>
    /  OR IDEALLY
    /  <<set $spookySounds = [$moodMusic, $footSteps]>>
    /  <<playsounds $spookySounds>>
    /
    / Play multiple sounds at once (picking up where we left off)
     *
     *  This macro requires a sound clip name
     *
     *  In addition, you may give it (in this order, please)
     *
     *  OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
     *  OPTIONAL: number of milliseconds to fade (0 ms by default)
     *  OPTIONAL: true if you'd like to loop, false if no
     *    
    /
    */
    macros.add("playsounds", {
        handler: function () {

          manageTripleArgs(this);

          var clipNames = this.args[0].toString().split(",");
          for (var index in clipNames) {
            if (clipNames.hasOwnProperty(index)) {
                var soundtrack = getSoundTrack(clipNames[index]);
                var volumeProportion = this.args.length > 1 ? this.args[1] : soundtrack.volumeProportion;
                var loop = this.args.length > 3 ? this.args[3] : false;
                soundtrack.overlap = this.args.length > 2 ? parseInt(this.args[2]) : 0;
                soundtrack.updateVolumeProportion(volumeProportion);
                soundtrack.play(loop); 
            }
          }
        }
    });



    /* <<pausesound "backgroundMusic.ogg">> 
    /
    /  Pauses "backgroundMusic.ogg" at its current location. 
    /  Use <<playsound "trees.ogg" >> to resume it.
    */  
    macros.add("pausesound", {
      handler: function() {
        if (this.args.length < 1) { return this.error("no audio clip name specified"); }                  
        getSoundTrack(this.args[0]).pause();
      }
    });


    /* <<pauseallsound>> 
    /
    /  Pauses all sounds at their current location. 
    /
    /  If you'd like the option to start multiple sounds,
    /  take a look at the "fadeinsounds" macro
    */ 
    macros.add("pauseallsound", {
      handler: function () {
        for (var clipName in clips) {
          if (clips.hasOwnProperty(clipName)) {
            if (clips[clipName] !== undefined) clips[clipName].pause();
          }
        }
      }
    });

    /* <<stopsound $backgroundMusic>>
    / 
    /  Stop the given sound immediately
    /  If the sound is played again, it will play from the beginning
    */    
    macros.add("stopsound", {
      handler: function() {
        if (this.args.length < 1) { return this.error("no audio clip name specified"); }                          
        getSoundTrack(this.args[0]).stopAndClear();
      }
    });


    /* <<stopallsound>>
    / 
    /  Stops all sounds immediately.
    /  If any stopped sound is played again, it will play from the beginning
    /
    /  If you'd like the option to start multiple sounds,
    /  take a look at the "fadeinsounds" macro
    */ 
    macros.add("stopallsound", {
        handler: function () {
          for (var clipName in clips) {
            if (clips.hasOwnProperty(clipName)) {
              if (clips[clipName] !== undefined) clips[clipName].stopAndClear();
            }
          }
        }
    });

    /* <<loopsound "backgroundMusic.mp3">>
    /  
    /  Starts playing the given clip on repeat.
    /  Note that browsers will not necessarily play looping audio seamlessly.
    /  For seamless audio, use a fade duration/overlap (third parameter) greater than zero
    /
     *  This macro requires a sound clip name
     *    
     *  OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
     *  OPTIONAL: number of milliseconds to overlap/crossfade the loop (0 by default)
    */    
    macros.add("loopsound", {
        handler: function () {
          
          manageTripleArgs(this);

          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = this.args.length > 1 ? this.args[1] : soundtrack.volumeProportion;
          soundtrack.overlap = this.args.length > 2 ? parseInt(this.args[2]) : 0;
          soundtrack.updateVolumeProportion(volumeProportion);
          soundtrack.loop();
       }
    });


    /* <<unloopsound $heartbeat>>
    /
    /  Let the given sound stop when it finishes its current loop
    /  (so the sound no longer repeats.)
    */ 
    macros.add("unloopsound", {
        handler: function () {
          if (this.args.length < 1) { return this.error("no audio clip name specified"); }          
          getSoundTrack(this.args[0]).looping = false;
       }
    });


    /* <<fadeinsound "heartbeat.mp3">>
    /
    / Identical to loopsound, but fades in the sound over 2 seconds.
    /
     *  This macro requires a sound clip name
     *    
     *  OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
     *  OPTIONAL: number of milliseconds to overlap/crossfade the loop (1000 ms aka 1 sec by default)
    /
    */
    macros.add("fadeinsound", {
        handler: function () {

          manageTripleArgs(this);
        
          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = this.args.length > 1 ? this.args[1] : soundtrack.volumeProportion; 
          soundtrack.overlap = this.args.length > 2 ? parseInt(this.args[2]) : soundtrack.overlap;
          soundtrack.updateVolumeProportion(volumeProportion);
          soundtrack.fadeSound(true);
        }
    });

    /* <<fadeinsounds ["moodMusic.mp3", "footsteps.mp3"]>>
    /  OR IDEALLY
    /  <<set $spookySounds = [$moodMusic, $footSteps]>>
    /  <<fadeinsounds $spookySounds>>
    /
    / Fade in multiple sounds at once.
    /
     *  This macro requires a sound clip name
     *    
     *  OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
     *  OPTIONAL: number of milliseconds to overlap/crossfade the loop (1000 ms aka 1 sec by default)
    /
    */
    macros.add("fadeinsounds", {
        handler: function () {

          manageTripleArgs(this);

          var volumeProportion = this.args.length > 1 ? this.args[1] : undefined; 
          var overlap = this.args.length > 2 ? parseInt(this.args[2]) : undefined;
          loopSounds(this.args[0].toString(), true, volumeProportion, overlap);
        }
    });

    /* <<fadeoutsound $birdsong>>
    /
    / Identical to stopsound, but fades out the sound over the stored fade duration (overlap).
    /
    */
    macros.add("fadeoutsound", {
        handler: function () {
          if (this.args.length < 1) { return this.error("no audio clip name specified"); }          
          fadeSound(this.args[0].toString(), false);
        }
    });


    /* <<fadeoutsounds ["moodMusic.mp3", "footsteps.mp3"]>>
    /  OR IDEALLY
    /  <<set $spookySounds = [$moodMusic, $footSteps]>>
    /  <<fadeoutsounds $spookySounds>>
    /
    / Fade out multiple sounds at once.
    /
    */
    macros.add("fadeoutsounds", {
        handler: function () {
          if (this.args.length < 1) { return this.error("no audio clip name specified"); }          
          loopSounds(this.args[0].toString(), false);
        }
    });


    /* <<quieter>>
    /
    / Reduces the story's globalVolume by 1/10th of the reader's system volume.
    / Thus creates a 10-unit volume range for the story
    /
    */
    macros.add("quieter", {
        handler: function () {
            adjustVolume(-1);
        }
    });

    /* <<louder>>
    /
    / Increases the story's globalVolume by 1/10th of the reader's system volume.
    / Thus creates a 10-unit volume range for the story
    /
    */
    macros.add("louder", {
        handler: function () {
            adjustVolume(1);
        }
    });


    /* <<jumpscare "scream.mp3">>
    /
    / Play the clip at maximum story volume
    / Don't affect any stored volume options
    / PLEASE GIVE THE READER A STARTLE WARNING BEFORE USING THIS.
    /
    */
    macros.add("jumpscare", {
      handler: function () {

          var soundtrack = getSoundTrack(this.args[0]);
          soundtrack.updateVolumeProportion(1.0);
          soundtrack.play();
      }
    });

  /***********************************************************
  *   END MACROS
  /***********************************************************/



}());

// You read the whole thing! THAT'S PRETTY RAD. Keep up the good work, and happy Twining.

