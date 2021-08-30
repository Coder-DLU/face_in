import React, { useEffect, useRef, useState } from 'react';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import * as tf from '@tensorflow/tfjs';
import soundURL from '../src/assest/hey_sondn.mp3';
import './App.css';

var sound = new Howl({
    src: [soundURL]
});


const NOT_TOUCH_LABLE = 'not_touch';
const TOUCHED_LABLE = 'touched';
const TRAINING_TIMES = 50;
// Mức tin tưởng
const TOUCHED_CONFIDENCE = 0.8;

function App() {
    const video = useRef();
    const classifier = useRef();
    const canPlaySound = useRef(true);
    const mobilenetModule = useRef();
    const [touched, setTouched] = useState(false);

    const init = async() => {
        console.log('init...');
        await setupCamera();
        console.log('success');

        classifier.current = knnClassifier.create();
        mobilenetModule.current = await mobilenet.load();
        console.log('setup success');
        console.log('khong bo tay len mat va bam train1');

        initNotifications({ cooldown: 3000 });
    }

    const setupCamera = () => {
        return new Promise((resolve, reject) => {
            navigator.getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;
            if (navigator.getUserMedia) {
                navigator.getUserMedia({ video: true },
                    stream => {
                        video.current.srcObject = stream;
                        video.current.addEventListener('loadeddata', resolve);
                    },
                    error => reject(error)
                );
            } else {
                reject();
            }
        });
    }
    const train = async label => {
            console.log(`${label} đang train cho máy`);
            for (let i = 0; i < TRAINING_TIMES; ++i) {
                console.log(`Progress ${parseInt((i+1) / TRAINING_TIMES * 100)}%`);

                await training(label);
            }
        }
        /**
         * Bước 1 : train cho máy khuôn mặt không chạm tay
         * Bước 2: train cho máy khôn măt chạm tay
         * Bước 3: Lấy hinhd hiện tại, phân tích và so sánh
         * ==> nếu mà matching với data khôn mặt chạm tay thì cảnh báo
         * @param {*} label 
         * @returns 
         */

    const training = label => {
        return new Promise(async resolve => {
            const embedding = mobilenetModule.current.infer(
                video.current,
                true
            );
            classifier.current.addExample(embedding, label);
            await sleep(100);
            resolve();
        });
    }

    const run = async() => {
        const embedding = mobilenetModule.current.infer(
            video.current,
            true
        );
        const result = await classifier.current.predictClass(embedding);

        console.log('label:', result.label);
        console.log('Confidences:', result.confidences);

        if (
            result.label === TOUCHED_LABLE &&
            result.confidences[result.label] > TOUCHED_CONFIDENCE
        ) {
            if (canPlaySound.current) {
                canPlaySound.current = false;
                sound.play();
            }
            console.log('Touched');
            sound.play();
            notify('Bỏ tay ra!', { body: 'Your message.' });
            setTouched(true);
        } else {
            console.log('No touched');
            setTouched(false);
        }

        await sleep(200);

        run();
    }

    const sleep = (ms = 0) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    useEffect(() => {
        init();

        sound.on('end', function() {
            canPlaySound.current = true;
        });

        //cleanup
        return () => {

        }
    }, []);

    return ( <
        div className = { `App ${touched ? 'touched' : ''}` } >
        <
        video ref = { video }
        className = "video"
        autoPlay /
        >
        <
        div className = "control" >
        <
        button className = "btn"
        onClick = {
            () => { train(NOT_TOUCH_LABLE) }
        } > Train1 < /button>  <
        button className = "btn"
        onClick = {
            () => { train(TOUCHED_LABLE) }
        } > Train2 < /button>  <
        button className = "btn"
        onClick = {
            () => { run() }
        } > Run < /button>   <
        /div>  <
        div className = "container" >
        <
        h3 > Hướng dẫn sử dụng: < /h3>  <
        p > Bước 1: nhấn train1 đề máy tính train khuôn mặt không chạm tay lên khuôn mặt < /p>  <
        p > Bước 2: nhấn train2 đề máy tính train khuôn mặt có chạm tay lên khuôn mặt < /p> <
        p > Bước 3: Lấy hình hiện tại trong video, phân tích và so sánh < /p>  <
        p > nếu mà matching với data khôn mặt chạm tay thì cảnh báo < /p>  <
        /div> <
        /div>
    );
}

export default App;