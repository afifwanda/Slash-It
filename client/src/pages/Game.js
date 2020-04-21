import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";

import { collideCircle, createHandKeypoint, findCoord } from '../helpers';

import Sketch from "react-p5";
import FruitLeft from "../objects/fruitLeft";
import FruitRight from "../objects/fruitRight";
import BombLeft from "../objects/bomLeft";
import BombRight from "../objects/bombRight";
import { gameStart } from "../store/actions/keypoints";

import GameOver from '../components/GameOver';
import FloatingScores from "../components/FloatingScores";
import { showFloatingScore } from "../store/actions/floatingScores";

const music = new Audio('/assets/audio/GameBg.mp3');
let fruitImageActive = [];
let fruitImageExplode = [];
let bombImageActive;
let bombImageExplode;

const Game = ({ width, height }) => {
  const dispatch = useDispatch();
  const [fruits, setFruits] = useState([]);
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [isTimerOn, setIsTimerOn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  let timerId = useRef();
  const [bombs, setBombs] = useState([]);
  const [boundary, setBoundary] = useState(400);
  const [lBoundary, setLBoundary] = useState(0);
  const [rBoundary, setRBoundary] = useState(0);
  const [gameMode, setGameMode] = useState(0);
  const [gameConfig, setGameConfig] = useState(
    [
      {
        fruitTriggerConstant: 0.98,
        bombTriggerConstant: 0.995,
        vyRandomFactor: 15,
        gravity: 0.15
      },
      {
        fruitTriggerConstant: 0.97,
        bombTriggerConstant: 0.99,
        vyRandomFactor: 20,
        gravity: 0.3
      },
      {
        fruitTriggerConstant: 0.96,
        bombTriggerConstant: 0.99,
        vyRandomFactor: 24,
        gravity: 0.4
      }
    ]
  );

  const calibrated = useSelector((state) => state.keypoint.calibrated);
  const keypoints = useSelector((state) => state.keypoint.keypoints);
  const isGameStarted = useSelector((state) => state.keypoint.isGameStarted);
  const fruitImages = useSelector((state) => state.item.fruits)

  useEffect(() => {
    music.addEventListener('ended', function() {
      music.play();
    })
    music.volume = 0.2;
    music.play();
  }, []);

  const countDown = () => {
    setTime((time) => time - 1);
  };

  const startTimer = useCallback(() => {
    setIsTimerOn(true);
    timerId.current = setInterval(() => countDown(), 1000);
  }, []);

  const start = useCallback(() => {
    if (!isTimerOn && !gameOver && isGameStarted ) {
      startTimer();
    }

    if (isGameStarted && !gameOver) {
      const lShoulder = findCoord('leftShoulder', keypoints);
      const rShoulder = findCoord('rightShoulder', keypoints);
      setLBoundary(lShoulder.x - 120)
      setRBoundary(rShoulder.x + 120)
      const { letfHandKeypoints, rightHandKeypoints } = createHandKeypoint(
        keypoints
      );

      if (letfHandKeypoints) {
        for (let fruit of fruits) {
          if (
            collideCircle(
              letfHandKeypoints.x,
              letfHandKeypoints.y,
              100,
              fruit.x,
              fruit.y,
              fruit.diameter
            )
            && fruit.isShown
          ) {
            if(!fruit.isDestroyed){
              dispatch(showFloatingScore(`+100`, fruit.x, fruit.y));
              setScore(score + 100);
            }
            fruit.destroy();
          }
        }

        for (let bomb of bombs) {
          if (
            collideCircle(
              letfHandKeypoints.x,
              letfHandKeypoints.y,
              80,
              bomb.x,
              bomb.y,
              bomb.diameter
            )
          ) {
            if(!bomb.isDestroyed){
              dispatch(showFloatingScore(`-100`, bomb.x, bomb.y));
              setScore(score - 100);
            }
            bomb.destroy();
          }
        }
      }
    
      if (rightHandKeypoints) {
        for (let fruit of fruits) {
          if (
            collideCircle(
              rightHandKeypoints.x,
              rightHandKeypoints.y,
              100,
              fruit.x,
              fruit.y,
              fruit.diameter
            )
            && fruit.isShown
          ) {
            if(!fruit.isDestroyed){
              dispatch(showFloatingScore(`+100`, fruit.x, fruit.y));
              setScore(score + 100);
            }
            fruit.destroy();
          }
        }

        for (let bomb of bombs) {
          if (
            collideCircle(
              rightHandKeypoints.x,
              rightHandKeypoints.y,
              80,
              bomb.x,
              bomb.y,
              bomb.diameter
            )
          ) {
            if(!bomb.isDestroyed){
              dispatch(showFloatingScore(`-100`, bomb.x, bomb.y));
              setScore(score - 100);
            }
            bomb.destroy();
          }
        }
      }

      // TODO: handle collide with bomb
    }

    if (time <= 0) {
      setGameOver(true);
      clearInterval(timerId.current);
    }

  }, [keypoints, fruits, isTimerOn, startTimer, isGameStarted, gameOver, time]);

  useEffect(() => {
    if (calibrated.keypoints && !isGameStarted && !gameOver) {
      setTimeout(() => {
        dispatch(gameStart());
      }, 4000)
    }

    start();
  }, [calibrated, start, isGameStarted, gameOver, dispatch]);

  // CANVAS P5 PRELOAD
  const preload = (p5) => {
    p5.Fredoka = p5.loadFont('/assets/FredokaOne-Regular.ttf')
    for(let i=0; i<fruitImages.length; i++){
      fruitImageActive.push( p5.loadImage( fruitImages[i].activeUrl ) )
      fruitImageExplode.push( p5.loadImage( fruitImages[i].explodeUrl ) )
    }
    bombImageActive = p5.loadImage( "/assets/bombs/bomb.png" )
    bombImageExplode = p5.loadImage( "/assets/bombs/bombExplode.png" )
  }

  // CANVAS P5 SETUP
  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(width, height).parent(canvasParentRef);
    p5.angleMode(p5.DEGREES)
  }

  const draw = (p5) => {
    p5.clear()
    if(Math.random() >= gameConfig[gameMode].fruitTriggerConstant){
      let randIntL = Math.floor( Math.random() * ( (fruitImageActive.length - 1) - 0) + 0 )
      setFruits([...fruits, new FruitLeft(
        p5, 
        lBoundary, 
        gameConfig[gameMode].gravity, 
        gameConfig[gameMode].vyRandomFactor,
        fruitImageActive[randIntL],
        fruitImageExplode[randIntL],
      )]);
    };
    if(Math.random() >= gameConfig[gameMode].fruitTriggerConstant){
      let randIntR = Math.floor( Math.random() * ( (fruitImageActive.length - 1) - 0) + 0 )
      setFruits([...fruits, new FruitRight(
        p5, 
        rBoundary, 
        gameConfig[gameMode].gravity, 
        gameConfig[gameMode].vyRandomFactor,
        fruitImageActive[randIntR],
        fruitImageExplode[randIntR],
      )]);
    };
    if(Math.random() >= gameConfig[gameMode].bombTriggerConstant){
      setBombs([...bombs, new BombLeft(
        p5,
        boundary,
        bombImageActive,
        bombImageExplode,
      )]);
    };
    if(Math.random() >= gameConfig[gameMode].bombTriggerConstant){
      setBombs([...bombs, new BombRight(
        p5,
        boundary,
        bombImageActive,
        bombImageExplode,
      )]);
    };
    
    for(let fruit of fruits){
      fruit.show()
      //if (fruit.isShown) {
        fruit.move()
      //}
    };

    for(let bomb of bombs){
      bomb.show()
      bomb.move()
    };

    p5.noStroke();
    
    p5.fill(0, 0, 0);
    p5.textFont(p5.Fredoka)

    p5.textSize(36);
    p5.text(`SCORE: ${score}`, 50, 50);
    p5.text(`Time: ${time}`, p5.width - 200, 50);

    // p5.rect(0, 0, lBoundary, p5.height-5);
    // p5.rect(rBoundary, 0, rBoundary, p5.height-5);
  }

  return(
    <>
    {/* <h1 style={{ textAlign: 'center' }} >Time: {time}</h1> */}
    {calibrated.keypoints && isGameStarted && !gameOver ? <Sketch preload={preload} setup={setup} draw={draw} /> : null}
    <FloatingScores/>
    { gameOver && <GameOver /> }
    </>
  )

};

export default Game;
