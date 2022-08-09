import Config from './Config.js';
import JitsiMeetUIHelper from '../JitsiMeetUIHelper.js';

/**
 * Class IVR
 */
export default class IVR {

    /**
     * Input room ID
     * @type {null|HTMLElement}
     */
    inputRoomID = null;

    /**
     * Open room button
     *
     * @type {HTMLElement|null}
     */
    enterRoomBtn = null;

    /**
     * Main IVR container
     * @type {HTMLElement|null}
     */
    mainIvrContainer = null;

    /**
     * Room ID typed by user
     * @type {String}
     */
    roomID = "";

    /**
     * Loader
     *
     * @type {HTMLElement|null}
     */
    loader = null;


    /**
     * JitsiMeetUIHelper instance
     *
     * @type {null|JitsiMeetUIHelper}
     */
    helper = null;


    /**
     * IVR constructor
     */
    constructor() {
        // IVR disabled in config
        if (!this.enabled()) return;

        if (window.IVR !== undefined) return window.IVR;

        // Init UI elements
        this.inputRoomID = document.getElementById('input_room_id');
        this.mainIvrContainer = document.getElementById('ivr_container');
        this.enterRoomBtn = document.getElementById('btn_enter_room');
        this.loader = document.getElementById('loader');

        let context = this;
        this.helper = new JitsiMeetUIHelper();

        // Set min & max length
        this.inputRoomID.setAttribute("minlength", Config.get('ivr.conference_code.min_length'));
        this.inputRoomID.setAttribute("maxlength", Config.get('ivr.conference_code.max_length'));

        // Listen to keydown events on input
        this.inputRoomID.addEventListener('keydown', function (event){
            context.onKeydown(event);
        });

        // Listen to click on enter room button
        this.enterRoomBtn.addEventListener('click', function (){
            context.enterRoom();
        });

        window.IVR = this;
    }

    /**
     * Return true if IVR is enabled in config
     *
     * @returns {boolean}
     */
    enabled(){
        return Config.get('ivr.enabled') === true;
    }

    /**
     * Show IVR main container
     */
    show(){
        this.mainIvrContainer.classList.remove('hidden');
    }

    /**
     * Hide IVR main container
     */
    hide(){
        this.mainIvrContainer.classList.add('hidden');
    }


    /* Listeners */

    /**
     * Get user input
     *
     * @param event
     */
    onKeydown(event){
        if (event.key === '#'){
            // Enter room
            this.enterRoomBtn.click();

        }else if (!isNaN(event.key)) {
            // Add digit
            this.roomID += event.key;

        }else if (event.key === 'Backspace'){
            // Remove last digit
            this.roomID = this.roomID.slice(0, -1)

        }else{
            event.preventDefault();
            event.stopPropagation();
        }
    }


    /**
     * Default on error
     *
     * @param reason
     */
    onError(reason){
        switch (reason){
            case 'room_id_too_short':
                console.log('Room ID too short')
                this.helper.renderError(reason);

                break;

            default:

                break;
        }
    }

    /**
     * Enter room
     */
    enterRoom(){
        if (this.roomID.length <= 3){
            this.onError('room_id_too_short')
        }else {
            // Hide previous errors
            document.getElementById('errors').classList.add('hidden');

            // Get conference room_id
            let url = Config.get('ivr.confmapper_url')+Config.get('ivr.confmapper_endpoint');
            let context = this;

            let onError= function(reason){
                context.loader.classList.add('hidden');
                context.inputRoomID.value = "";
                context.roomID = "";
                context.helper.onError('room_id', reason);
            };

            this.loader.classList.remove('hidden');

            fetch(`${url}?id=${this.roomID}`, {method: 'get',})
                .then(response => {
                    response.json()
                        .then(function (data) {
                            if (data.hasOwnProperty('conference')){
                                context.loader.classList.remove('hidden')

                                document.getElementById('ivr_container').classList.add('hidden');

                                context.helper.roomID = data.conference;
                                context.helper.initRoom();
                            }
                        })
                        .catch(onError);
                }).catch(onError);
        }
    }
}