/**
 * Class JitsiMeetUIHelper
 */
class JitsiMeetUIHelper {

    /**
     * Room ID
     */
    roomID = undefined;

    /**
     * JitsiMeetExternalAPI instance
     */
    jitsiApiClient = undefined;

    /**
     * the DTMF menu
     */
    dtmfMenu= undefined;

    /**
     * @var object : Main button to show DTMF menu
     */
    dtmfMenuButton = undefined;

    /**
     * Configuration parameters
     */
    config = {};


    /**
     * List of available commands
     */
    commands = {
        'show-dtmf-menu': 'showDTMFMenu',
        'toggle-audio': 'toggleAudio',
        'toggle-video': 'toggleVideo',
        'toggle-chat': 'toggleChat',
        'toggle-tile-view': 'toggleTileView',
        'toggle-rise-hand' : 'toggleRiseHand'
    };


    /**
     * Constructor
     */
    constructor(){
        // IFrame already initialised
        if (window.JitsiMeetUIHelper !== undefined) return;

        this.dtmfMenu = document.getElementById('dtmf_menu_content');
        this.dtmfMenuButton = document.getElementById('dtmf_show_menu_btn');

        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        if (!urlParams.has('room_id'))
            throw new Error('room_id not set')

        this.roomID = urlParams.get('room_id');

        // Update page title
        document.title = this.roomID;

        // Fetch config
        fetch('config.json', {"method": "get"})
            .then(response => {
                response.json()
                    .then( config => {
                        this.config = config;

                        // Update locale
                        if (this.config.hasOwnProperty('lang'))
                            Lang.changeLocal(this.config.lang);

                        // init the room
                        this.initJitsiMeetConference();

                        window.JitsiMeetUIHelper = this;
                    })
                    .catch(error => {
                        throw new Error(error);
                    })
            })
            .catch(error => {
                throw new Error(error);
            })
    }

    /**
     * Init the JitsiMeet conference (using the JitsiMeetExternalAPI)
     *
     * @see https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/
     */
    initJitsiMeetConference(){
        let mainOptions = {
            roomName: this.roomID,
            width: document.getElementById('main_iframe_container').width,
            height: document.getElementById('main_iframe_container').height,
            interfaceConfigOverwrite: {
                CLOSE_PAGE_GUEST_HINT: true
            },
            configOverwrite: {
                callStatsID: '',
                defaultLanguage: 'fr',
                enablePopupExternalAuth: true,
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                p2p: {enabled: false},
                desktopSharingChromeDisabled: true
            },
            parentNode: document.getElementById('main_iframe_container'),
        }

        // Connect main client
        let subDomain = this.config.domain.replace(/^https?:\/\//, '');
        this.jitsiApiClient = new JitsiMeetExternalAPI(subDomain, mainOptions);

        // Use timeout to not speak states changed at startup
        let context = this;
        setTimeout(function(){
            // Add listeners
            context.addListeners();
        }, 2500);
    }


    /**
     * Executes command. The available commands are:
     *
     * @param name
     * @param args
     */
    executeCommand(name, ...args) {
        if (!(name in this.commands)) {
            console.error(`[Error] Command '${name}' not found`)

        }else{
            console.log(`Received command: ${name}`);
            switch (name){
                case 'show-dtmf-menu':
                    this.#toggleMenu();
                    this.speakFromCommand('show-dtmf-menu', document.getElementById('dtmf_menu_content').classList.contains('show'));
                    break;

                case 'toggle-audio':
                case 'toggle-video':
                case 'toggle-chat':
                case 'toggle-tile-view':
                case 'toggle-rise-hand':
                    // Send generic command to JitsiMeetExternalAPI
                    this.jitsiApiClient.executeCommand(this.commands[name], args);
                    break;

                default:
                    console.error(`[Error] Command '${name}' not handled yet`)
            }
        }
    }


    /**
     * Listen to state changes
     */
    addListeners(){
        let context = this;

        // Mute / unmute audio
        this.jitsiApiClient.addListener('audioMuteStatusChanged', function (response){
                context.speakFromCommand('toggle-audio', !response.muted);
            }
        );

        // Mute / unmute video
        this.jitsiApiClient.addListener('videoMuteStatusChanged', function (response){
                context.speakFromCommand('toggle-video', !response.muted);
            }
        );

        // Hide / show chat'
        this.jitsiApiClient.addListener('chatUpdated', function (response){
                context.speakFromCommand('toggle-chat', response.isOpen);
            }
        );

        // Hide / show tile view
        this.jitsiApiClient.addListener('tileViewChanged', function (response){
                context.speakFromCommand('toggle-tile-view', response.enabled);
            }
        );

        // Hand rise / down
        this.jitsiApiClient.addListener('raiseHandUpdated', function (response){
                context.speakFromCommand('toggle-rise-hand', response.handRaised);
            }
        );

    }


    /**
     * Command to toggle hide/show main menu
     */
    #toggleMenu(){
        if (!this.dtmfMenu.classList.contains('show')) {
            this.dtmfMenu.classList.remove('hide');
            this.dtmfMenu.classList.add('show');


        }else {
            this.dtmfMenu.classList.remove('show');
            this.dtmfMenu.classList.add('hide');
        }
    }


    /**
     * Get text to pass to the TTS from command
     *
     * @param command
     * @param show
     */
    speakFromCommand(command, show = null){
        // TTS disabled
        if (!this.config.enable_tts) return;

        let trKey = null;

        switch (command){
            case 'show-dtmf-menu':
                trKey = this.dtmfMenu.classList.contains('show') ? 'menu_shown' : 'menu_hidden';
                break;

            case 'toggle-audio':
                trKey = show ? 'micro_enabled' : 'micro_disabled';
                break;

            case 'toggle-video':
                trKey = show ? 'camera_enabled' : 'camera_disabled';
                break;

            case 'toggle-chat':
                trKey = show ? 'chat_shown' : 'chat_hidden';
                break;

            case 'toggle-tile-view':
                trKey = show ? 'tile_view_shown' : 'tile_view_hidden';
                break;

            case 'toggle-rise-hand':
                trKey = show ? 'hand_raised' : 'hand_down';
                break;

            default:
                console.error(`[Error] [TTS] Command '${name}' not handled yet`);
        }

        if (trKey !== null){
            this.speak(Lang.translate(trKey));
        }
    }


    /**
     * EXPERIMENTAL
     * Use browser embedded TTS
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
     *
     * @param text Text to be spoken
     */
    speak(text = null){
        // Speak only if enabled in config
        if (this.config.enable_tts && text !== null){
            let utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.speak(utterance);
        }
    }
}

export default JitsiMeetUIHelper;