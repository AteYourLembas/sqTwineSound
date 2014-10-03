/*
sqTwineSound HTML5 Sound Macro Suite
Copyright 2014 Tory Hoke

Program URI: http://www.sub-q.com/plugins/sqTwineSound/
Description: Sound macros for Twine creations, including controls for volume, fade interval, and playing multiple tracks at once.
Version: 0.8.0
Author: Tory Hoke
Author URI: http://www.toryhoke.com
License: GNU General Public License
License URI: http://www.opensource.org/licenses/gpl-license.php
Repository: https://github.com/AteYourLembas/sqTwineSound
FAQ / Q & A: http://sub-q.com/questions (password: ThinkVast)
Bug Reports/Feature Requests: http://sub-q.com/forums/topic/what-would-you-like-to-see-sqtwinesound-do-that-its-not-doing/ (password: ThinkVast)

      sub-Q.com is password-protected while it's in beta (until January 2015.)
      Please kick the tires and report any issues with the website
      via the sub-Q.com Contact form.


This program based on:
Twine: HTML5 sound macros by Leon Arnott of Glorious Trainwrecks
the source and influence of which appear under a Creative Commons CC0 1.0 Universal License

This program uses
 * easeInOutSine()
 * Copyright © 2001 Robert Penner
 * All rights reserved.
 *
 * As distributed by Kirupa
 * http://www.kirupa.com/forum/showthread.php?378287-Robert-Penner-s-Easing-Equations-in-Pure-JS-(no-jQuery)
 *
 * Open source under the BSD License. 
 * 
 * 
 * Redistribution and use in source and binary forms, with or without modification, 
 * are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of 
 * conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list 
 * of conditions and the following disclaimer in the documentation and/or other materials 
 * provided with the distribution.
 * 
 * Neither the name of the author nor the names of contributors may be used to endorse 
 * or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
 * AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
 * OF THE POSSIBILITY OF SUCH DAMAGE. 


This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
  
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

*/

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

    // Convenience vars
    var clipNameLabel = "Clip Name";
    var overlapLabel = "Overlap";
    var volumeProportionLabel = "Volume Proportion";
    var loopLabel = "Loop?";


    //------------ Robert Penner via Kirupa math methods ----------
    //-------------------------------------------------------------

    function easeInOutSine(currentIteration, startValue, changeInValue, totalIterations) {
        return changeInValue / 2 * (1 - Math.cos(Math.PI * currentIteration / totalIterations)) + startValue;
    }


    //------------ End Math methods -------------------------------
    //-------------------------------------------------------------

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
        // Use ease
        //
        this.__fadeSound = function(audioObj, fadeIn) {

          var startVolume = fadeIn ? 0 : globalVolume * this.volumeProportion;
          var deltaVolume = globalVolume * this.volumeProportion * (fadeIn ? 1 : -1);

          //alert("__fadeSound! fadeIn " + fadeIn + ", globalVolume " + globalVolume + ", volProp " + this.volumeProportion + " startVol " + startVolume + " deltaVolume " + deltaVolume);

          // Handy vars for easing
          var totalIterations = this.overlap/updateInterval;
          var currentIteration = 1;

          audioObj.interval = setInterval(function() {

              //Use easing to prevent sound popping in or out
              //
              var desiredVolume = easeInOutSine(currentIteration, startVolume, deltaVolume, totalIterations);
              audioObj.volume = desiredVolume;
              currentIteration += 1;
            
              if (audioObj.volume === (startVolume + deltaVolume)) { 
                //alert("Grats! You reached your destination of " + audioObj.volume); 
                clearInterval(audioObj.interval); 
              }

              //This effectively stops the loop and poises the volume to be played again
              //That way the clip isn't needlessly looping when no one can hear it.
              if (audioObj.volume === 0) {
                  audioObj.pause();
                  audioObj.currentTime = 0;
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

          // Don't even bother with crossfade if there's no overlap
          if (sqAudioObj.overlap !== undefined && sqAudioObj.overlap > 1) {

            // fade out current sound
            //
            sqAudioObj._fadeSound(currAudioObj, false);

            // And fade in our partner
            //
            //nextAudioObj.volume = 0;          
            //if (nextAudioObj.currentTime > 0) nextAudioObj.currentTime = 0;
            //nextAudioObj.play();
            sqAudioObj._fadeSound(nextAudioObj, true);

          }
          else {
            sqAudioObj.updateVolume();          
            nextAudioObj.currentTime = 0;
            nextAudioObj.play();
          }

          // Kick off the next timer to crossfade
          // Might as well garbage collect the old crossfadeTimeout, too.
          //
          //if (sqAudioObj.crossfadeTimeout !== undefined) { sqAudioObj.crossfadeTimeout.stopAndClear(); delete sqAudioObj.crossfadeTimeout; }
          //if (isNaN(sqAudioObj.getDuration())) { this.error("Can't loop because duration is not known (audio not loaded, probably not found.)"); return; }
          //sqAudioObj.crossfadeTimeout = new pausableTimeout(sqAudioObj._crossfadeLoop, [sqAudioObj, nextAudioObj]); 
          //sqAudioObj.crossfadeTimeout.activate(sqAudioObj.getDuration()*1000-sqAudioObj.overlap);

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
            if (fadeIn) {
              this.stopAndClear();
              this.looping = true;
            }
            else this.looping = false;
            this._fadeSound(this._getActiveAudio(), fadeIn);
        };

        // Update volume proportion and volume of both audio clips
        //
        this.setVolumeProportion = function(volumeProportion) {
            this.volumeProportion = volumeProportion;
        };

        // Update volume of active audio clips (assumes vol proportion and global vol already set)
        //
        this.updateVolume = function() {
            this._getActiveAudio().volume = globalVolume * this.volumeProportion;
        };

        // Play the current audio object and reactivate any paused timer
        //
        this.play = function(loop) {

          //If it's a loop we want, just loop and don't make a big deal out of it
          if (loop) this.loop();

          else {

            var activeAudioObj = this._getActiveAudio();
            if (activeAudioObj) {  
                activeAudioObj.play();
              }
          }
        };

        // Pause whatever audio is currently playing and pause the timer, too
        //
        this.pause = function() {
          if (this.crossfadeTimeout !== undefined) this.crossfadeTimeout.deactivate();
          this._getActiveAudio().pause();
        };

        // Stop whatever audio is currently playing and dump the timer
        //
        this.stopAndClear = function() {
          var activeAudioObj = this._getActiveAudio();
          activeAudioObj.pause();
          if (activeAudioObj.currentTime > 0) activeAudioObj.currentTime = 0;
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
    /  Here be monsters.
    /
    */

    // Given the clipName, get the active soundtrack
    //
    function getSoundTrack(clipName) {
        clipName = cleanClipName(clipName.toString());
        if (!clips.hasOwnProperty(clipName)) { this.error("Given clipName " + clipName + " does not exist in this project. Please check your variable names."); }
        return clips[clipName];
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
    // Because of the total expected arguments (one string, one float, one int, one boolean)
    // This method attempts to be forgiving of sequence. 
    // Be advised if there were even one more argument, it probably couldn't be so forgiving anymore!
    //
    function manageCommonArgs(func, requiredArgs) {

          // Look at the list of available arguments, clean them up, and take the first one of each desired type:
          // Recreate the arguments as a list in required sequence [clipName, volumeProportion, overlap, loop]

          var clipName;
          var volumeProportion;
          var overlap;
          var loop;

          for (var i = 0; i < func.args.length; i++) {
            switch (typeof func.args[i]) {
              case "string" :
                if (clipName === undefined) clipName = func.args[i].toString();
                break;
              case "number" :
                var tempNum = parseFloat(func.args[i]);
                if (volumeProportion === undefined && tempNum <= 1.0) volumeProportion = tempNum;
                else if (overlap === undefined && tempNum >=updateInterval) overlap = tempNum; 
                break;
              case "boolean" :
                if (loop === undefined) loop = func.args[i];
                break;
            }
          }

          for (var requiredArg in requiredArgs) {
            if (requiredArgs.hasOwnProperty(requiredArg)) {
              switch (requiredArg) {
                case clipNameLabel :
                  if (clipName === undefined) { return this.error("No audio clip name specified."); } 
                  break;
                case volumeProportionLabel :
                  if (volumeProportion === undefined || volumeProportion > 1.0 || volumeProportion < 0.0) { return this.error("No volume proportion specified (must be a decimal number no smaller than 0.0 and no bigger than 1.0.)"); }
                  break;
                case overlapLabel :
                  if (overlap === undefined) { return this.error("No fade duration specified (must be a number in milliseconds greater than + " + updateInterval + " ms.)"); }
                  break;
                case loopLabel :
                  if (loop === undefined) { return this.error("No loop flag provided (must be a boolean, aka true or false.)"); }
                  break;
              }
            }
          }

          return [clipName, volumeProportion, overlap, loop];
    }

    // Get the clipName up to the . if a . exists, otherwise do no harm
    //
    function cleanClipName(clipName) {
      return clipName.lastIndexOf(".") > -1 ? clipName.slice(0, clipName.lastIndexOf(".")) : clipName;
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
    
     Given a decimal between 0.0 and 1.0, 
     updates the clip's volume proportion and the clip's actual volume
    
    */
    macros.add("updatevolume", {
        handler: function () {
          
          var args = manageCommonArgs(this, [clipNameLabel, volumeProportionLabel]);
          var soundtrack = getSoundTrack(this.args[0]);
          soundtrack.setVolumeProportion(args[1]);
          soundtrack.updateVolume();
        }
    });

    /**
      <<playsound "meow.mp3">> OR <<playsound "meow" 0.8>> OR <<playsound $meow 0.8 true>> OR <<playsound $meow 0.8 true 200>>
     
       This version of the macro lets you do a little bit of sound mixing.
     
       Parameters:

           REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)     
           OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
           OPTIONAL: number of milliseconds to overlap/crossfade the loop (0 ms by default)
           OPTIONAL: true if you'd like to loop, false if no
     
       So this plays a clip normally, at full global volume
     
           <<playsound $walla">>
     
       OR this fades in a quiet background $walla that will loop and crossfade with 2000 ms (2 seconds) of overlap:
     
           <<playsound $walla 0.2 2000 true>>
     
       And this plays a louder $meow on top:
     
           <<playsound $meow 1.0>>
     
     
     */
    macros.add("playsound", {
      handler : function () {

          var args = manageCommonArgs(this, [clipNameLabel]);

          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = args[1] !== undefined ? args[1] : soundtrack.volumeProportion;
          soundtrack.overlap = args[2] !== undefined ? args[2] : 0;
          var loop = args[3] !== undefined ? args[3] : false;
          soundtrack.setVolumeProportion(volumeProportion);
          soundtrack.updateVolume();
          soundtrack.play(loop); 
        }
    });


    /* <<set $spookySounds = [$moodMusic, $footSteps]>>
      <<playsounds $spookySounds 0.5 true>>
    
      Play multiple sounds at once (picking up where we left off)
      If you give it no sounds to play, it quietly ignores the command.

      Parameters:

          OPTIONAL: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)
          OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
          OPTIONAL: number of milliseconds to overlap/crossfade (0 ms by default)
          OPTIONAL: true if you'd like to loop, false if no
         
    /
    */
    macros.add("playsounds", {
        handler: function () {

          var clipNameString = this.args[0];
          if (this.args[0] === undefined) return;
          clipNameString = this.args[0].toString();
          if (clipNameString == "[]") return;
          var clipNames = clipNameString.split(",");
          if (clipNames.length < 1)  return;

          var args = manageCommonArgs(this);
          for (var index = 0; index < clipNames.length; index++) {
                var soundtrack = getSoundTrack(cleanClipName(clipNames[index]));
                var volumeProportion = args[1] !== undefined ? args[1] : soundtrack.volumeProportion;
                soundtrack.overlap = args[2] !== undefined ? args[2] : 0;
                var loop = args[3] !== undefined ? args[3] : false;
                soundtrack.setVolumeProportion(volumeProportion);
                soundtrack.updateVolume();
                soundtrack.play(loop); 
          }
        }
    });



    /* <<pausesound "backgroundMusic.ogg">> 
    
     Pauses "backgroundMusic.ogg" at its current location. 
     Use <<playsound "trees.ogg" >> to resume it.

     Parameters:

         REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)

    */  
    macros.add("pausesound", {
      handler: function() {
        var args = manageCommonArgs(this, [clipNameLabel]);                 
        getSoundTrack(this.args[0]).pause();
      }
    });


    /* <<pauseallsound>> 
    
      Pauses all sounds at their current location. 
    
      If you'd like the option to start multiple sounds,
      take a look at <<playsounds>> and <<fadeinsounds>>
    */ 
    macros.add("pauseallsound", {
      handler: function () {
        for (var clipName in clips) {
          if (clips.hasOwnProperty(clipName)) {
            getSoundTrack(clipName).pause();
          }
        }
      }
    });

    /* <<stopsound $backgroundMusic>>
     
      Stop the given sound immediately
      If the sound is played again, it will play from the beginning
  
      Parameters:

          REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)
    */    
    macros.add("stopsound", {
      handler: function() {
        var args = manageCommonArgs(this, [clipNameLabel]);                        
        getSoundTrack(this.args[0]).stopAndClear();
      }
    });


    /* <<stopallsound>>
     
      Stops all sounds immediately.
      If any stopped sound is played again, it will play from the beginning
    
      If you'd like the option to start multiple sounds,
      take a look at <<playsounds>> and <<fadeinsounds>>
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
      
      Starts playing the given clip on repeat.
      Note that browsers will not necessarily play looping audio seamlessly.
      For seamless audio, use a fade duration/overlap (third parameter) greater than 1 millisecond
      (Well, you probably want something more perceptibe than 1 millisecond!)
        
      Parameters:

       REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)     
       OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
       OPTIONAL: number of milliseconds to overlap/crossfade the loop (0 ms by default)
    */    
    macros.add("loopsound", {
        handler: function () {
          
          var args = manageCommonArgs(this, [clipNameLabel]);

          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = args[1] !== undefined ? args[1] : soundtrack.volumeProportion;
          soundtrack.overlap = args[2] !== undefined ? args[2] : 0;
          soundtrack.setVolumeProportion(volumeProportion);
          soundtrack.updateVolume();
          soundtrack.loop();
       }
    });


    /* <<unloopsound $heartbeat>>
    
      Let the given sound stop when it finishes its current loop
      (so the sound no longer repeats.)

      Parameters:

          REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)     

    */ 
    macros.add("unloopsound", {
        handler: function () {
          var args = manageCommonArgs(this, [clipNameLabel]);         
          getSoundTrack(this.args[0]).looping = false;
       }
    });


    /* <<fadeinsound "heartbeat.mp3">>
    
      Identical to loopsound, but fades in the sound over 2 seconds.

      Parameters:

          REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)     
          OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
          OPTIONAL: number of milliseconds to overlap/crossfade the loop (defaults to clip's last set overlap)

    */
    macros.add("fadeinsound", {
        handler: function () {

          var args = manageCommonArgs(this, [clipNameLabel]);
        
          var soundtrack = getSoundTrack(this.args[0]);
          var volumeProportion = args[1] !== undefined ? args[1] : soundtrack.volumeProportion; 
          soundtrack.overlap = args[2] !== undefined ? args[2] : soundtrack.overlap;
          soundtrack.volumeProportion=volumeProportion;
          soundtrack.fadeSound(true);
        }
    });

    /* <<fadeinsounds ["moodMusic.mp3", "footsteps.mp3"]>>

        Fade in multiple sounds at once.
    
      Parameters:

          REQUIRED: clipNames as list (e.g. [$backgroundMusic, $footsteps])     
          OPTIONAL: decimal proportion of volume (0.0 being minimum/mute, and 1.0 being maximum/default)
          OPTIONAL: number of milliseconds to overlap/crossfade the loop (defaults to clip's last set overlap)
    
    */
    macros.add("fadeinsounds", {
        handler: function () {

          var clipNameString = this.args[0];
          if (this.args[0] === undefined) return;
          clipNameString = this.args[0].toString();
          if (clipNameString == "[]") return;
          var clipNames = clipNameString.split(",");
          if (clipNames.length < 1)  return;

          for (var index = 0; index < clipNames.length; index++) {
            fadeSound(cleanClipName(clipNames[index]), true);
          }
        }
    });

    /* <<fadeoutsound $birdsong>>
    
      Identical to stopsound, but fades out the sound over the stored fade duration (overlap).
    
      Parameters:

          REQUIRED: clipName (e.g. "backgroundMusic.mp3" or $backgroundMusic)

    */
    macros.add("fadeoutsound", {
        handler: function () {
          var args = manageCommonArgs(this, [clipNameLabel]);         
          fadeSound(this.args[0].toString(), false);
        }
    });


    /* <<fadeoutsounds [$moodMusic, $footsteps]>>
    
      Fade out multiple sounds at once.
      If you give it no sounds to play, it quietly ignores the command.

      Parameters:

          REQUIRED: clipNames as list (e.g. [$backgroundMusic, $footsteps])     
    
    */
    macros.add("fadeoutsounds", {
        handler: function () {

          var clipNameString = this.args[0];
          if (this.args[0] === undefined) return;
          clipNameString = this.args[0].toString();
          if (clipNameString == "[]") return;
          var clipNames = clipNameString.split(",");
          if (clipNames.length < 1)  return;

          for (var index = 0; index < clipNames.length; index++) {
            fadeSound(cleanClipName(clipNames[index]), false);
          }
        }
    });


    /* <<quieter>>
    
     Reduces the story's globalVolume by 1/10th of the reader's system volume.
     Thus creates a 10-unit volume range for the story
    
    */
    macros.add("quieter", {
        handler: function () {
            adjustVolume(-1);
        }
    });

    /* <<louder>>
    
     Increases the story's globalVolume by 1/10th of the reader's system volume.
     Thus creates a 10-unit volume range for the story
    
    */
    macros.add("louder", {
        handler: function () {
            adjustVolume(1);
        }
    });


    /* <<jumpscare "scream.mp3">>
    
     Play the clip at maximum story volume
     Don't affect any stored volume options
     PLEASE GIVE THE READER A STARTLE WARNING BEFORE USING THIS.
    
    */
    macros.add("jumpscare", {
      handler: function () {
          var args = manageCommonArgs(this, [clipNameLabel]);
          var soundtrack = getSoundTrack(this.args[0]);
          soundtrack.setVolumeProportion(1.0);
          soundtrack.updateVolume();
          soundtrack.play();
      }
    });

  /***********************************************************
  *   END MACROS
  /***********************************************************/



}());

// You read the whole thing! THAT'S PRETTY RAD. Keep up the good work, and happy Twining.

