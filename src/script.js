let masterModule;
let keyFlag; // キー情報

// enemy関連
const diamArray = [30, 40, 60, 65, 75, 80, 90];
//const sizeFactor = [1.1, 1.6, 2.1, 2.6, 3.1, 3.9, 4.6]; // 1, 2, 3, 4, 5桁
//const alignFactor = [3.0, 4.5, 6, 8, 8, 10, 15];
const DOWN_COS = Math.cos(Math.PI / 24);
const DOWN_SIN = Math.sin(Math.PI / 24);
const speedFactor = [3.5, 3.0, 2.5, 2.0, 1.5, 1.0, 0.6]
const message = ["STAGE", "PLAY", "FAILED...", "GAME OVER...", "CLEAR!", "ALL CLEAR!"];

// score関連
const baseScore = [200, 500, 2000, 5000, 10000, 30000, 50000] // 1, 2, 3, 4, 5, 6, 7桁
const shotScore = [100, 300, 50]; // /2, /3, +1を当てたときの基本スコア。

// load関連
let assetsIcon = []; // 0と1にグラフィックを入れる感じで
let enemyLeftImg;
let enemyLeftImgArraySet = []; // 左画像arrayのセット
let enemyRightImg;
let enemyRightImgArraySet = []; // 右画像arrayのセット
let enemyDownImg;
let enemyDownImgArray = [];
const ass = "https://inaridarkfox4231.github.io/numberBallAssets/"; // 面倒なので。

function preload(){
  // ここでloadImage("https://inaridarkfox4231.github.io/フォルダ名/ファイル名.png")ってやれば呼び出せるよ。
  assetsIcon.push(...[loadImage(ass + "player_0.png"), loadImage(ass + "player_1.png")]);
  enemyLeftImg = loadImage(ass + "enemyLeftImg.png");
  enemyRightImg = loadImage(ass + "enemyRightImg.png");
  enemyDownImg = loadImage(ass + "enemyDown.png");
}

function setup(){
  createCanvas(480, 540);
	textAlign(CENTER);
	masterModule = new master();
  masterModule.setGenerator();
	noStroke();
	keyFlag = 0;
  for(let k = 0; k < 7; k++){
    // setにarrayをひとつずつ入れていく。0番に0~7の動き画像、1番に0~7の・・以下略。
    let enemyLeftImgArray = [];
    let enemyRightImgArray = [];
    for(let i = 0; i < 8; i++){
      let grLeft = createGraphics(40, 40);
      let grRight = createGraphics(40, 40);
      // 5番目と6番目が元画像（でかいの）における左上座標、そのあとは普通に40x40でOK.
      grLeft.image(enemyLeftImg, 0, 0, 40, 40, i * 40, k * 40, 40, 40);
      grRight.image(enemyRightImg, 0, 0, 40, 40, i * 40, k * 40, 40, 40);
      enemyLeftImgArray.push(grLeft);
      enemyRightImgArray.push(grRight);
    }
    enemyLeftImgArraySet.push(enemyLeftImgArray);
    enemyRightImgArraySet.push(enemyRightImgArray);
  }/*
  for(let i = 0; i < 8; i++){
    let grLeft = createGraphics(40, 40);
    let grRight = createGraphics(40, 40);
    grLeft.image(enemyLeftImg, 0, 0, 40, 40, i * 40, 0, 40, 40);
    grRight.image(enemyRightImg, 0, 0, 40, 40, i * 40, 0, 40, 40);
    enemyLeftImgArray.push(grLeft);
    enemyRightImgArray.push(grRight);
  }*/
  for(let k = 0; k < 7; k++){
    let gr = createGraphics(40, 40);
    gr.image(enemyDownImg, 0, 0, 40, 40, k * 40, 0, 40, 40);
    enemyDownImgArray.push(gr);
  }
}
// 1桁は40, 2桁は50, 3桁は60が適切かも。4桁は65にしたい。5桁は75にしたい。
// で、小さくするとサイズも小さくなるとか。たとえば60で攻撃して桁が減ると50になるとか。
// 角度はいいとして、速さ・・大きい程ゆっくりみたいな？うーん・・むずかしいか。
// サイズによって色を変えようかな。
// 赤→オレンジ→緑→青で5桁が紫。
// 6桁になると黒です（嘘です）

function draw(){
	background(255, 200, 200);
	masterModule.update();
	masterModule.render();
	masterModule.drawStatus();
	masterModule.createShot();
	masterModule.check();
}

function keyTyped(){
  if(key === 'q'){ keyFlag |= 1; } // Qでショット変更。
  else if(key === 'z'){ keyFlag |= 2; } // Zで発射。
}

function flagReset(){
	keyFlag = 0;
}

// めんどくさいからボール型が左右に動くだけにしよう。で、直線的にショットが飛んでいく感じ。
// ショットも円で。いちいちこだわるよりさっさとプロトタイプ作りたいのよ。
// Qキーを検知したらショットを変えてフラグを消す。
// Zキーを検知したらwait20加算してfireフラグを立ててキーフラグを消す。
// masterがfireフラグを感知してtype情報を取得しつつshotに追加してfireフラグを消す。
class cannon{
	constructor(){
		this.x = width / 2;
		this.y = height - 60;
		this.shotTypeId = 0; // 0が2倍ショット、1が3倍ショット、2が+1ショット。
		this.maxShotTypeId = 3; // 3種類！
		this.wait = 0; // 正である限り減り続ける。wait中はbodyの黒と白が反転する。正の間はショットが撃てない。
		this.fire = false;
	}
	update(){
		// 左右キーで移動、Qでショット変更、Zで発射。Zによる発射はfireのFlagを立てればマスターが感知して
		// shotArrayにshotを入れてくれるのでそんな感じで。また、インターバルを用意して連射出来ないようにする。
		if(this.wait > 0){ this.wait--; }
		if(keyIsDown(RIGHT_ARROW)){
			this.x += 5;
		}else if(keyIsDown(LEFT_ARROW)){
			this.x -= 5;
		}
		this.x = constrain(this.x, 10, width - 10);
		if(keyFlag & 1){ this.revolve(); flagReset(); }
		if((keyFlag & 2) && this.wait === 0){
			// waitが0でZキーフラグが立っている。
			this.fire = true;
			this.wait += 20;
			flagReset();
		}
	}
	revolve(){
		// ショットの変更
		this.shotTypeId = (this.shotTypeId + 1) % this.maxShotTypeId;
	}
	getShotTypeId(){ return this.shotTypeId; }
	getPos(){ return {x:this.x, y:this.y}; }
	fireOff(){ this.fire = false; }
	render(){
		/*fill((this.wait > 0  ? 255 : 0));
		ellipse(this.x, this.y, 20, 20);
		fill((this.wait > 0 ? 0 : 255));
		rect(this.x - 5, this.y - 5, 3, 6);
		rect(this.x + 3, this.y - 5, 3, 6);*/
    let index = (this.wait > 0 ? 1 : 0);
    //image(playerIcon[index], this.x - 10, this.y - 10);
    image(assetsIcon[index], this.x - 10, this.y - 10);
	}
	reset(){
		this.shotTypeId = 0;
		this.wait = 0;
		this.fire = false;
		this.x = width / 2;
		this.y = height - 60;
	}
}

// 一直線にとんでいくボール。そんだけでいいんじゃない。
// typeId情報を持たせておかないと衝突判定でめんどうなことになる。そろそろ行こ。
// レーザーがいいなー・・そうすればx軸方向の判定だけで済むし。
// x軸方向で交わるものを割り出してy座標が一番下のものがひとつだけヒットする感じ。
// マウス移動で自機動かしてマウスダウンで方向調整、アップした時にカーソルのある方向に発射しても面白いかも。まぁいいや。
class shot{
	constructor(x, y, shotTypeId){
		this.t = 0;
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = -8; // 速度は(0, -8)で固定だけど、衝突した時に弾かれた場合の処理を書きたいので。
		this.diam = 15;
		this.shotTypeId = shotTypeId;
		this.color = shot.getShotColor(shotTypeId);
		this.active = true;
		this.hitFlag = 0; // 当たった場合の情報あれこれ
	}
	inActivate(){ this.active = false; } // 画面上方に消える場合と、衝突して弾かれた場合。右か左の斜め下にとんで消える。
	setVelocity(vx, vy){
		this.vx = vx;
		this.vy = vy;
	}
	update(){
		this.x += this.vx;
		this.y += this.vy;
		if(this.y < 0 || this.y > height){
			if(this.y < 0){ this.setHitFlag(5); } // 上方に消える場合のフラグ処理。上方なのでthis.y < 0. 間違えました。
			this.inActivate();
		} // 上か下に消える感じ。んー・・流れ弾には当たり判定がないようにする。
	}
	render(){
		fill(this.color);
		ellipse(this.x, this.y, this.diam, this.diam);
	}
	getShotTypeId(){ return this.shotTypeId; }
	getHitFlag(){ return this.hitFlag; }
	setHitFlag(flag){ this.hitFlag = flag; }
	hit(flag){
		// flag === true: きちんと当たった場合。その場で消える。falseの場合は速度を変える。
		this.setHitFlag(flag); // フラグを設定
		// flagが4の場合(弾かれる)以外はinActivateで消しちゃってOK. 4の場合だけ速度の変更を行う。
		if(flag === 4){
			let theta = Math.PI / 3 + random(Math.PI / 3);
			this.setVelocity(8 * Math.cos(theta), 8 * Math.sin(theta));
		}else{
			this.inActivate();
		}
	}
	static getShotColor(index){
		switch(index){
			case 0:
				return color(237, 28, 36);
			case 1:
				return color(63, 72, 204);
		}
		return color(0);
	}
}

// 到達したenemyが1体でも現れたらGAMEOVERになって全部やり直しスコアもリセット
// クリアするには一定数の敵を倒す必要がありそれを満たすとボスが現れて倒すとクリアみたいなシステム作りたい
// 作れない。詰んだ。
class enemy{
	constructor(num, x){
		this.num = num;
		this.uniqueIndex = enemy.calcFactorIndex(num); // スコア計算などに使う不変Index
		this.factorIndex = this.uniqueIndex; // 文字表示などに使う可変Index（0~6）
		//this.diam = diamArray[this.factorIndex];
    this.diam = 40; // 直径は固定
		this.color = enemy.getBodyColor(this.uniqueIndex);
		this.x = x;
		this.y = this.diam / 2 + 40; // ちょっと下方修正（残機表示用に）
		this.speed = speedFactor[this.factorIndex];
		let sgn = random([1, -1]);
		this.vx = this.speed * sgn * DOWN_COS;
		this.vy = this.speed * DOWN_SIN;
		this.alive = true;
		this.arrived = false;
		this.count = 0; // 攻撃を受けたときにダメージに応じて速度が発生する感じ。
    this.frame = 0; // アニメーション制御用
    this.frameMax = 4 + this.factorIndex; // 最終的にはfactorIndexにより変化させる（4,5,6,7,8,9,10)
    this.leftImgArray = enemyLeftImgArraySet[this.uniqueIndex];
    this.rightImgArray = enemyRightImgArraySet[this.uniqueIndex];
    this.downImg = enemyDownImgArray[this.uniqueIndex]; // ダウンイメージを色別にする
    // ダウンイメージは最後まで変わらないので注意する
	}
	update(){
		if(!this.alive){ return; }
    this.frame++;
		if(this.count > 0){
			this.count--;
			this.vy += 0.1; // 移動距離はnフレームで0.05 * n * nくらい。30, 40, 50ならおよそ45, 80, 125になる。
		}
		let newX = this.x + this.vx;
		let newY = this.y + this.vy;
		if(newX < this.diam / 2){ this.x = this.diam / 2; this.vx = this.speed * DOWN_COS; }
		if(newX > width - this.diam / 2){ this.x = width - this.diam / 2; this.vx = -this.speed * DOWN_COS; }
		this.x = newX;
		this.y = newY;
		if(this.y < this.diam / 2){ this.y = this.diam / 2; } // 画面外に行かない処理
		if(this.y > height - 40 - this.diam / 2){ this.arrived = true; } // 陣地に到達
	}
	render(){
		//fill(this.color);
		//ellipse(this.x, this.y, this.diam, this.diam);
    if(this.vx > 0){
      image(this.rightImgArray[(Math.floor(this.frame / this.frameMax)) % 8], this.x - 20, this.y - 25);
    }else{
      image(this.leftImgArray[(Math.floor(this.frame / this.frameMax)) % 8], this.x - 20, this.y - 25);
    }

		// ここに透明処理かぶせてブリンクを表現したいかな。分かりづらいので。
		//fill(255);
		//textSize(this.diam / sizeFactor[this.factorIndex]);
		//text(this.num, this.x, this.y + this.diam / alignFactor[this.factorIndex]);
    fill(0);
    textSize(25);
    text(this.num, this.x, this.y + 40);
    //text(this.num, this.x, this.y + this.diam / 2 + 20);
	}
	hit(shotTypeId){
		// 当たった場合の処理。0:/2shot. 1:/3shot. 2:+1shot.
		// ブリンクでヒットしない：フラグ番号5.
		if(this.count > 0){ return 5; }
		let hitFlag = 0; // shotに伝えるhitFlag変数。
		if(shotTypeId === 0){
			// /2shotについて
			if(this.num % 2 === 0){ hitFlag = 1; this.num = Math.floor(this.num / 2); }
			else{ hitFlag = 4; this.num *= 3; }
		}else if(shotTypeId === 1){
			// /3shotについて
			if(this.num % 3 === 0){ hitFlag = 2; this.num = Math.floor(this.num / 3); }
			else{ hitFlag = 4; this.num *= 2; }
		}else{
			// +1shotについて
			hitFlag = 3; this.num++;
		}
		// 1になったら爆砕。
    // masterがこれを検知して、配列から外し、エフェクトを発生させる流れ。
		if(this.num === 1){ this.alive = false; return hitFlag; }
    let newIndex = enemy.calcFactorIndex(this.num);
    this.formChange(newIndex);
		//this.factorIndex = enemy.calcFactorIndex(this.num);
		//this.diam = diamArray[this.factorIndex];
		//this.speed = speedFactor[this.factorIndex];
    //this.frameMax = 4 + this.factorIndex; // フレーム制御変更
    //this.frame = 0; // フレームリセット
    // 最終的には使う画像も変更する・・
		//this.vx = (this.vx > 0 ? this.speed * DOWN_COS : -this.speed * DOWN_COS);
		//this.vy = this.speed * DOWN_SIN;
    // 30, 40, 50にしてみる。
		if(hitFlag > 0 && hitFlag < 4){
			if(shotTypeId < 2){
				let boundFactor = shotTypeId + 4;
			  this.count = boundFactor * 10; // 40ないし50.
			  this.vy -= boundFactor; // 4ないし5.
			}else{
				// +1ショットの場合
				this.count = 30;
				this.vy -= 3;
			}
		}
		return hitFlag;
	}
  formChange(newIndex){
    // factorIndexが変化した場合の処理あれこれ
    this.factorIndex = newIndex;
    this.speed = speedFactor[this.factorIndex];
    this.frameMax = 4 + this.factorIndex; // フレーム制御変更
    this.frame = 0; // フレームリセット
    this.vx = (this.vx > 0 ? this.speed * DOWN_COS : -this.speed * DOWN_COS);
		this.vy = this.speed * DOWN_SIN;
  }
	getUniqueIndex(){ return this.uniqueIndex; }
	static getBodyColor(index){
		switch(index){
			case 0:
				return color(255, 0, 0); // 赤
			case 1:
				return color(230, 177, 0); // オレンジ
			case 2:
				return color(34, 177, 76); // 緑
			case 3:
				return color(0, 162, 232); // 水色
			case 4:
				return color(163, 73, 164); // 紫
			case 5:
				return color(185, 122, 87); // 茶色
		}
		return color(127); // 灰色(7桁)
	}
	static calcFactorIndex(num){
	  if(num < 10){ return 0; }
	  else if(num < 100){ return 1; }
	  else if(num < 1000){ return 2; }
	  else if(num < 10000){ return 3; }
		else if(num < 100000){ return 4; }
		else if(num < 1000000){ return 5; }
	  return 6;
  }
}

// enemyを倒したときのなんか。
// (x, y)を中心として8方向に円を飛ばしたい。円の直径はdiamの1/4くらい。
class effect{
	constructor(x, y, col, img){
		this.x = x;
		this.y = y;
		this.color = col;
		this.diam = 40;
    this.img = img;
		this.life = 60; // 1秒アニメ。0.5秒だけアレが表示されて残りの0.5秒でいつも通りにやる。
    this.angleArrayX = [];
    this.angleArrayY = [];
    for(let i = 0; i < 8; i++){
      this.angleArrayX.push(Math.cos(Math.PI * i / 4));
      this.angleArrayY.push(Math.sin(Math.PI * i / 4));
    }
	}
  update(){
		this.life--; // lifeが0のeffectはcheckで排除する。
	}
	render(){
    if(this.life > 30){
      image(this.img, this.x - 20, this.y - 25);
    }else{
      fill(this.color);
      // angleは0からPI/2まで動かしたい。lifeが30から0なので60で割って逆転させる。
      let angle = Math.PI * ((30 - this.life) / 60);
      let r = this.diam * Math.sin(angle);
      for(let i = 0; i < 8; i++){
        ellipse(this.x + this.angleArrayX[i] * r, this.y + this.angleArrayY[i] * r, this.diam / 4, this.diam / 4);
      }
    }
	}
}

// スコアの増減（ゲームプレイ中）を数字で表現する感じ。
// 複数ある場合は縦に重なって同時に出現する。青で＋と、赤で－で表現。30フレームで消える。上に上昇。
class numberFloat{
	constructor(num, x, y){
    this.num = num;
		this.x = x;
		this.y = y;
		this.count = 0;
		this.active = true;
	}
	inActivate(){ this.active = false; }
	update(){
		if(!this.active){ return; }
		this.count++;
		if(this.count === 45){ this.inActivate(); }
	}
	render(){
		if(!this.active){ return; }
		let t = (this.num > 0 ? 0 : 255);
		fill(t, 0, 255 - t);
		textSize(25);
		let mark = (this.num > 0 ? "+" : "-");
		text(mark + abs(this.num).toString(), Math.floor(this.x), this.y - this.count);
	}
}

class master{
	constructor(){
		this.enemyArray = [];
		this.shotArray = [];
		this.effectArray = []; // 8方向に円が飛び出して消える感じ。
    this.floatArray = []; // スコア変動をヴィジュアライズするもの
		this.myCannon = new cannon();
		this.stageNumber = 0;
		this.maxStageNumber = 2;
		this.score = 0;
		this.scoreLevel = 0; // 桁数。スコアが変わるたびに変更される。
		this.hitChain = 0;  // 連鎖ボーナス用
		this.missChain = 0; // 連鎖ペナルティ用
    // ジェネレータ関連
    this.generatorArray = [];
    this.count = 60; // メッセージ表示用
    this.necessary = 0; // クリアに必要な討伐数
    this.state = 0; // 0:START、1:PLAY、2:FAILED、3:GAMEOVER、4:CLEAR、5:ALL CLEAR.
    this.maxLife = 2; // 残機数復元用
    this.life = this.maxLife; // 残機数
	}
	setGenerator(){
		// どの範囲の数がどれくらいの確率で出るかみたいなこと
		if(this.stageNumber === 0){
      this.necessary = 5;
      this.registGenerator({id:1, param:[1, 1, [2, 20, 200, 2000, 20000], [80, 160, 200, 240, 320]]});
		}else if(this.stageNumber === 1){
      this.necessary = 2;
      this.registGenerator({id:0, param:[2, 60, 3, 200]});
    }
	}
	collisionCheck(){
		// shotと敵・・当たったら敵がやられるか、敵が数を減らすか、数を増やすか、その度に色々再計算。
		// shotがtype情報をくれるので衝突したらそれを元に数を変更、1になった場合はalive=falseでcheckの際に外される。
		// effect出したいけど今はいいです。あとで・・。
		for(let k = 0; k < this.enemyArray.length; k++){
			// eがいずれかのsと当たるか調べる。
			let e = this.enemyArray[k];
			if(!e.alive){ continue; } // 既に倒れている場合はスルー。
			for(let i = 0; i < this.shotArray.length; i++){
				let s = this.shotArray[i];
				if(s.vy > 0 || (!s.active)){ continue; } // 既に衝突して消滅したか、下向きに移動中かっていう。
				let distPow2 = Math.pow(e.x - s.x, 2) + Math.pow(e.y - s.y, 2);
				let radiusSumPow2 = Math.pow((e.diam + s.diam) / 2, 2);
				if(radiusSumPow2 > distPow2){
					// 衝突した場合
					let hitFlag = e.hit(s.getShotTypeId());
					s.hit(hitFlag);
					// エフェクト発生は倒した場合だけ！
					if(!e.alive){ this.createEffect(e.x, e.y, e.color, e.downImg); }
				}
			}
		}
	}
	toNextStage(){
		this.stageNumber++;
	}
	reset(){
		this.enemyArray = [];
		this.shotArray = [];
    this.generatorArray = [];
		this.myCannon.reset();
    if(this.state === 3 || this.state === 5){
      // スコアのリセットはGAMEOVERのときとALL CLEARのときだけ
		  this.score = 0; // スコアリセット
		  this.scoreLevel = 0; // スコアレベルリセット
      this.life = this.maxLife; // 自機数を戻す
      this.stageNumber = 0; // ALL CLEARのときは勝手に0になるけどGAMEOVERでは途中からでも0になるので
    }
		// chainのリセット忘れずに
		this.hitChain = 0;
		this.missChain = 0;
		this.setGenerator();
    this.count = 60; // リセットでカウントを戻す
    this.state = 0;
	}
	update(){
    if(this.count > 0){
      this.count--;
      if(this.count === 0){
        if(this.state === 0){
          this.state = 1;
        }else{
          // START以外はすべてSTARTに戻る。
          this.reset();
          this.state = 0;
        }
      }
      return;
    }
    this.generatorArray.forEach((g) => { g.update(); })
		this.enemyArray.forEach((e) => { e.update(); })
		this.shotArray.forEach((s) => { s.update(); });
		this.effectArray.forEach((ef) => { ef.update(); });
    this.floatArray.forEach((f) => { f.update(); });
		this.myCannon.update();
	}
	render(){
		this.enemyArray.forEach((e) => { e.render(); })
		this.shotArray.forEach((s) => { s.render(); });
		this.effectArray.forEach((ef) => { ef.render(); });
    this.floatArray.forEach((f) => { f.render(); });
		this.myCannon.render();
	}
	drawStatus(){
    //fill(0);
    //text(this.life, 100, 200); // とりあえず適当に。
    for(let i = 0; i < this.life; i++){
      image(assetsIcon[0], i * 30 + 5, 5)
    }
    // 最終的には例のアイコンをいくつも表示する感じ。
    if(this.count > 0){
      push();
      fill(0);
      textAlign(LEFT);
      textSize(30);
      let t = "";
      if(this.state === 0){
        t = "STAGE " + (this.stageNumber + 1).toString();
      }else{
        t = message[this.state];
      }
      text(t, 50, 80);
      pop();
    }
		fill(200);
		rect(0, 500, 480, 40);
		const textArray = ["/2", "/3", "+1"];
		let shotTypeId = this.myCannon.getShotTypeId();
		for(let i = 0; i < 3; i++){
			let q = (i === shotTypeId ? 0 : 255);
			fill(q);
			rect(i * 60 + 4, 504, 52, 32);
			fill(255 - q);
			textSize(25);
			text(textArray[i], 30 + i * 60, 530);
		}
		fill(0);
		textSize(30);
		text(this.score, 460 - 10 * this.scoreLevel, 530);
    // 1桁、2桁、・・・、7桁について460, 450, 440, 430, 420, 410, 400って感じかな・・
		// スコアを計算するたびに桁数を計算してそれを元に表示補正を行う。補正の内容はこれでOK.
		if(this.hitChain > 0){
			fill(0, 0, 255);
		  text("x" + this.hitChain, 240, 530);
		}else if(this.missChain > 0){
			fill(255, 0, 0);
			text("x" + this.missChain, 240, 530);
		}
	}
	createShot(){
		if(!this.myCannon.fire){ return; }
		let p = this.myCannon.getPos();
		let shotTypeId = this.myCannon.getShotTypeId();
		this.shotArray.push(new shot(p.x, p.y, shotTypeId));
		this.myCannon.fireOff();
	}
	createEffect(x, y, col, img){
		this.effectArray.push(new effect(x, y, col, img));
	}
	remove(){
		// 画面外に飛び出したshotを排除する
		// このときshotがフラグを持っているのでそれを使ってchainを計算する感じ。
		// ペナルティによるスコア減もここで。速度のyが下向きだったらそれを検知してchainの計算とスコア減、そのあとフラグを消す。
		// なのでまずはフラグを見て、それから判断する感じ。
		for(let i = 0; i < this.shotArray.length; i++){
			if(i === this.shotArray.length){ break; }
			let s = this.shotArray[i];
			// shotArray[i]のフラグを取得してchainの計算をするのはここで
			let flag = s.getHitFlag();
			if(flag !== 0){ // フラグが0の場合は何もしない
        let diff = this.calcChain(flag); // chain計算の際のスコア変動を戻り値として受け取る。
        if(diff !== 0){ this.calcScore(diff, s.x, s.y); }
      }
			if(flag === 4){ s.setHitFlag(0); } // 弾かれた場合はフラグを0にする
			if(s.active){ continue; }
			this.shotArray.splice(i, 1); // not activeなら排除
		}
		// 倒したenemyを排除する
		for(let i = 0; i < this.enemyArray.length; i++){
			if(i === this.enemyArray.length){ break; }
      let e = this.enemyArray[i];
			if(e.alive){ continue; }
			// とりあえずこのタイミングで倒した敵のスコアが・・それだけ、ね。
      // 敵を倒すのはここ。
			let index = e.getUniqueIndex();
      let higherFactor = (e.y < height / 2 ? 2 : 1); // 高い場所で倒すとスコア2倍
      // 高さのfactorとthis.hitChainを基礎点に掛けたものがスコアになる
			this.calcScore(higherFactor * baseScore[index] * this.hitChain, e.x, e.y - e.diam / 2);
			this.enemyArray.splice(i, 1);
      this.necessary--;
      // エフェクトが残ってしまうので、クリア判定は最後で。
		}
		// 終了したeffectを排除する
		for(let i = 0; i < this.effectArray.length; i++){
			if(i === this.effectArray.length){ break; }
			if(this.effectArray[i].life > 0){ continue; }
			this.effectArray.splice(i, 1);
		}
    // 終了したfloatを排除する（若干冗長・・ていうかこれもエフェクト扱いでいい気も）
		for(let i = 0; i < this.floatArray.length; i++){
			if(i === this.floatArray.length){ break; }
			if(this.floatArray[i].active){ continue; }
			this.floatArray.splice(i, 1);
		}
	}
	check(){
		// 衝突判定、消滅判定、GAMEOVER判定。
    // count > 0のときはやらない
    if(this.count > 0){ return; }
		this.collisionCheck(); // ここでshotのフラグが確定する
		this.remove(); // shotのフラグを元にchainが計算され、それを元に敵を倒した場合のスコアも計算される
		for(let i = 0; i < this.enemyArray.length; i++){
			if(this.enemyArray[i].arrived || this.enemyArray[i].num >= 10000000){
        // FAILEDかGAMEOVERかを残機数で判定。1減らして0かどうかで見る。
        this.count = 60;
        this.life--;
        if(this.life > 0){ this.state = 2; }else{ this.state = 3; }
        // 先にstateを変えて数字が出現しないようにする
        let diff = Math.floor(this.score * 0.01) * 10;
				this.calcScore(-diff); // やられるとスコア0.9倍.
        return;
      } // 陣地に到達されたら1ミス。
		}
    if(this.necessary === 0 && this.effectArray.length === 0 && this.floatArray.length === 0){
      // 必要数倒してかつエフェクト,フロートが終わっていることがクリア条件
      this.count = 60;
      this.toNextStage(); // ステージを進める
      if(this.stageNumber < this.maxStageNumber){
        this.state = 4;
      }else{
        this.state = 5;
        // 先にstateを変えて数字が出現しないようにする。
        let diff = Math.floor((this.score * (Math.pow(1.1, this.life) - 1)) / 10) * 10;
				this.calcScore(diff); // ライフボーナス(残機数の回数だけ1.1倍)
      }
    }
    this.generateEnemy();
	}
	calcChain(flag){
    // スコア変動を戻り値に取る。
    switch(flag){
			case 1: //   /2shotは当てるだけで100点。
				this.hitChain += 1; this.missChain = 0;
        return 100;
			case 2: //   /3shotは当てるだけで300点。
				this.hitChain += 3; this.missChain = 0;
				return 300;
			case 3: //   +1shotは当てるだけで50点。
				this.hitChain = 0; this.missChain = 0;
				return 50;
			case 4: //   missChainの値×100点を引く。
				this.hitChain = 0; this.missChain++;
				return -100 * this.missChain;
			case 5:
				this.hitChain = 0;
        break;
		}
    return 0;
	}
	calcScore(diff, x, y){
		// diffの分だけスコアを増減する（減らすときはここに負の数が入る）
		// 0未満や10000000以上にはならないようにする
		this.score = constrain(this.score + diff, 0, 10000000);
		this.calcScoreLevel();
    if(this.state === 1){
      this.floatArray.push(new numberFloat(diff, x, y));
    }
	}
	calcScoreLevel(){
		if(this.score < 10){ this.scoreLevel = 0; return; }
		let base = 10;
		for(let i = 1; i <= 6; i++){
			base *= 10;
			if(this.score < base){
				this.scoreLevel = i;
				break;
			}
		}
		return;
	}
  registGenerator(command){
    // commandひとつひとつはidとparam配列からなる。
    // id:0はsimpleMonoGeneratorでrepeat, interval, num, posの配列
    // id:1はsimpleMultiGeneratorでrepeat, interval, numArray, posArrayの配列
    // とりあえずこんなもん？
    let p = command.param;
    switch(command.id){
      case 0:
        this.generatorArray.push(new simpleMonoGenerator(p[0], p[1], p[2], p[3]));
        return;
      case 1:
        this.generatorArray.push(new simpleMultiGenerator(p[0], p[1], p[2], p[3]));
        return;
    }
  }
  generateEnemy(){
    this.generatorArray.forEach((g) => {
      if(g.fire){
        let enemyDataArray = g.generate();
        enemyDataArray.forEach((data) => {
          this.enemyArray.push(new enemy(data.n, data.x));
        })
        g.fireOff(); // これがないとえらいことになる
      }
    })
  }
}

// generator.いくつか持つことが基本。
// これをmasterがいくつか持ってて、updateさせて準備が出来たらgenerateさせて別メソッドでenemyArrayに補充する感じ。
// signalをtrueにすれば・・で、いくつかenemy,ひとつとは限らない、複数かも知れないそれらをこっちで用意してenemy配列を出力。
// masterがそれを受け取ってenemyArrayに追加する流れ。
// 要は、何フレーム後にいくつを数指定で位置指定するだけ.
// 指定するのは数と位置だけなので。数も位置も固定とランダムの2通りで指定できる。
// 両方を受け取る方法・・typeofしてnumberなら固定、そうでなければランダム指定（[2, 3]とか。objectになる。）
// [3, 9]ってやったときに3,4,5,6,7,8,9のうちどれかが出て欲しい。関数作ろう。

// repeat:実行回数。-1だとエンドレス。-1の場合はmasterが命令してinActiveにする感じにしたりして。
class generator{
	constructor(repeat){
		this.count = 0;
    this.fire = false; // これがtrueになったらmasterがgenerateを呼び出す仕組み。
    this.repeat = repeat;
    this.active = true; // falseになったら排除するシステムとかそんな感じ。
    // そこら辺のあれやこれやをupdateに書く。必要ならmasterに情報をもらう。
	}
  inActivate(){ this.active = false; }
  fireOff(){
    this.fire = false; // メソッドを使ってオフにしないとバグを見つけづらくなる。
  }
	update(){
    if(!this.active){ return; }
		this.count++;
	}
	generate(){
    // 敵のデータを返す。配列の形になっている。多分。
    return [];
	}
}

// ひとつの範囲に一定フレームごとに1匹ずつ出現させるプログラム。
// interval:実行間隔 num:数、または数の範囲 pos:位置、または位置の範囲.
class simpleMonoGenerator extends generator{
  constructor(repeat, interval, num, pos){
    super(repeat);
    this.interval = interval;
    this.data = {num:num, pos:pos}; // numやposは数、または範囲指定の2成分配列
  }
  update(){
    if(!this.active){ return; }
    this.count++;
    if(this.count === this.interval){
      this.fire = true;
      this.count = 0;
      if(this.repeat > 0){ this.repeat--; }
      if(this.repeat === 0){ this.inActivate(); }
    }
  }
  generate(){
    let enemyData = getParam(this.data.num, this.data.pos);
    return [enemyData];
  }
}

// 複数の範囲に一定フレームごとに複数匹ずつ出現させる。
class simpleMultiGenerator extends generator{
  constructor(repeat, interval, numArray, posArray){
    super(repeat);
    this.interval = interval;
    this.dataArray = [];
    for(let i = 0; i < numArray.length; i++){
      this.dataArray.push({num:numArray[i], pos:posArray[i]});
    }
  }
  update(){
    if(!this.active){ return; }
    this.count++;
    if(this.count === this.interval){
      this.fire = true;
      this.count = 0;
      if(this.repeat > 0){ this.repeat--; }
      if(this.repeat === 0){ this.inActivate(); }
    }
  }
  generate(){
    let enemyDataArray = [];
    for(let i = 0; i < this.dataArray.length; i++){
      enemyDataArray.push(getParam(this.dataArray[i].num, this.dataArray[i].pos));
    }
    return enemyDataArray;
  }
}

// objが4とか9のときは4や9を返す。[11, 13]とかならたとえばこのときは11, 12, 13のどれかを返す。
// typeof便利やな。どんどん使っていこう。
// numとxの組を返す関数。すなわち敵の情報のすべて。
function getParam(num, pos){
	let n, x;
	if(typeof(num) === "number"){ n = num; }else{ n = Math.floor(random(num[0], num[1] + 1)); }
	if(typeof(pos) === "number"){ x = pos; }else{ x = random(pos[0], pos[1]); }
	return {n:n, x:x};
}

// パターン1: 一定時間ごとに上部5か所のどこかに出現する
// 方向は下方30°くらい？
// パターン2: 一定時間ごとに上部5か所のうち異なるどこか2か所に出現する
// パターン3: 一定時間ごとに一定間隔で上部5か所のうちどこか異なる2か所に
// パターン4:3ヵ所。
// で、桁数が増えていく感じ。桁数ごとに速さを変える。
// 結論：5か所で3桁はきつい。（・・・）
// めんどくさいな・・
// 1桁：(2, 0.4) 2桁：(2, 0.35) 3桁：(2, 0.3) 4桁：(2, 0.2) 5桁：(2, 0.1)
