sqTwineSound
============

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

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
  
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.


SUITE CONTENTS


     updatevolume    clipName, *volumeProportion e.g. <<updatevolume $clipName 0.5>>
     playsound       clipName
     playsounds      [clipName1, clipName2, ...]
     pausesound      clipName
     pauseallsound   
     stopsound       clipName
     stopallsound    
     oopsound        clipName, *volumeProportion, *overlap
     unloopsound     clipName
     fadeinsound     clipName
     fadeinsounds    [clipName1, clipName2, ...], *volumeProportion, *overlap
     fadeoutsound    clipName
     fadeoutsounds   [clipName1, clipName2, ...]
     quieter
     louder
     jumpscare       clipName <-- PLEASE GIVE YOUR READER A STARTLE WARNING BEFORE USING JUMPSCARE!



KNOWN ISSUES

- If your story throws an alert, it will probably pause the sound playback. Note that whenever sound playback is paused by something other than another sqTwineSound macro, the timing of loops will be thrown off. One way to work around this is to manually pause sound in your passage (<<pausesound $backgroundMusic>>) before you throw up the alert, and then resume the sound <<playsound $backgroundMusic>>again after the alert.

- When vigorously stopping and resuming multiple tracks, there is sometimes some skipping and unexpected behavior. Not sure why. Investigating.

- As of Twine v 1.4.2, the Sugarcane and Jonah story formats don't seem to hand off variables to these custom macros. For example, if you're using Sugarcane or Jonah, please use <<playsound "music.mp3">> instead of playsound <<$music>>. Sugarcane and Jonah also don't have the neat <<button>> macro that the Sugarcube story format does, so making volume control buttons could be a bit of an adventure. I personally prefer the Sugarcube story format, but I'm not the boss of you.


BONUS FEATURES

- The full demo (using the Sugarcube story format) provides working examples

- A Sugarcane- and Jonah-friendly flavor of the script works with native Twine story formats. I can't guarantee this flavor will always have the same features of the Sugarcube flavor, but I hope it's useful.

- The macros that take multiple parameters (e.g. clip name, volume proportion, and overlap) make a good-faith effort not to freak out if you give them these parameters in an unexpected order. It can kind of figure out that "clipName.mp3" is the clip name, and 0.5 is the volume proportion, and 2000 is the milliseconds to overlap. But if you try to mix up a macro's preferred order of parameters AND give it a decimal number as overlap, expect the unexpected!