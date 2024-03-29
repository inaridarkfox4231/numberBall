let masterModule;
let keyFlag; // キー情報

// enemy関連
const diamArray = [30, 40, 60, 65, 75, 80, 90];
const sizeFactor = [1.1, 1.6, 2.1, 2.6, 3.1, 3.9, 4.6]; // 1, 2, 3, 4, 5桁
const alignFactor = [3.0, 4.5, 6, 8, 8, 10, 15];
const DOWN_COS = Math.cos(Math.PI / 24);
const DOWN_SIN = Math.sin(Math.PI / 24);
const speedFactor = [2.4, 2.1, 1.8, 1.5, 1.2, 0.9, 0.6];

// score関連
const baseScore = [200, 500, 2000, 5000, 10000, 30000, 50000] // 1, 2, 3, 4, 5, 6, 7桁
const shotScore = [100, 300, 50]; // /2, /3, +1を当てたときの基本スコア。

function setup(){
  createCanvas(480, 540);
	textAlign(CENTER);
	masterModule = new master();
	noStroke();
	keyFlag = 0;
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
		fill((this.wait > 0  ? 255 : 0));
		ellipse(this.x, this.y, 20, 20);
		fill((this.wait > 0 ? 0 : 255));
		rect(this.x - 5, this.y - 5, 3, 6);
		rect(this.x + 3, this.y - 5, 3, 6);
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
			if(this.y < 0){ this.setHitFlag(5); } // 上方に消える場合のフラグ処理。上方なのでthis.y < 0. 間違えました。ごめんなさい。
			//if(this.hitFlag === 5){ console.log("fail"); }
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
		this.factorIndex = this.uniqueIndex; // 文字表示などに使う可変Index
		this.diam = diamArray[this.factorIndex];
		this.color = enemy.getBodyColor(this.factorIndex);
		this.x = x;
		this.y = this.diam / 2;
		this.speed = speedFactor[this.factorIndex];
		let sgn = random([1, -1]);
		this.vx = this.speed * sgn * DOWN_COS;
		this.vy = this.speed * DOWN_SIN;
		this.alive = true;
		this.arrived = false;
		this.count = 0; // 攻撃を受けたときにダメージに応じて速度が発生する感じ。
	}
	update(){
		if(!this.alive){ return; }
		if(this.count > 0){
			this.count--;
			this.vy += 0.1; // /2の場合は30フレームかけて3を0にするので0.1x0.5x30x31で45くらい動く。/3の場合は0.1x0.5x40x41で80くらい。+1で20くらい。
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
		fill(this.color);
		ellipse(this.x, this.y, this.diam, this.diam);
		// ここに透明処理かぶせてブリンクを表現したいかな。分かりづらいので。
		fill(255);
		textSize(this.diam / sizeFactor[this.factorIndex]);
		text(this.num, this.x, this.y + this.diam / alignFactor[this.factorIndex]);
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
		if(this.num === 1){ this.alive = false; return hitFlag; } // masterがこれを検知して、配列から外し、エフェクトを発生させる流れ。
		this.factorIndex = enemy.calcFactorIndex(this.num);
		this.diam = diamArray[this.factorIndex];
		this.speed = speedFactor[this.factorIndex];
		this.vx = (this.vx > 0 ? this.speed * DOWN_COS : -this.speed * DOWN_COS);
		this.vy = this.speed * DOWN_SIN;
		//this.color = enemy.getBodyColor(this.factorIndex); // 色は不変とする。
		// +1でも動かそうね。20, 30, 40の2, 3, 4でいいよ。0.1ずつ減らす。
		// つまんないから20, 40, 60に戻す。難しいステージが作れなくて面白くない。
		if(hitFlag > 0 && hitFlag < 4){
			if(shotTypeId < 2){
				let boundFactor = shotTypeId * 2 + 4;
			  this.count = boundFactor * 10; // 40ないし60.
			  this.vy -= boundFactor; // 4ないし6.
			}else{
				// +1ショットの場合
				this.count = 30;
				this.vy -= 3;
			}
		}
		return hitFlag;
	}
	getUniqueIndex(){ return this.uniqueIndex; }
	static getBodyColor(index){
		switch(index){
			case 0:
				return color(255, 0, 0);
			case 1:
				return color(230, 177, 0);
			case 2:
				return color(34, 177, 76);
			case 3:
				return color(0, 162, 232);
			case 4:
				return color(163, 73, 164);
			case 5:
				return color(185, 122, 87); // 茶色
		}
		return color(127); // 灰色
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
class effect{
	constructor(x, y, diam, col){
		this.x = x;
		this.y = y;
		this.color = col;
		this.diam = diam;
		this.life = 30; // 1秒アニメ。とりあえず円が消える感じでいいよ。
	}
  update(){
		this.life--; // lifeが0のeffectはcheckで排除する。
	}
	render(){
		fill(this.color);
		let d = this.diam * this.life / 60;
		ellipse(this.x, this.y, d, d);
	}
}

class master{
	constructor(){
		this.enemyArray = [];
		this.shotArray = [];
		this.effectArray = []; // 8方向に円が飛び出して消える感じ。
		this.myCannon = new cannon();
		this.stageNumber = 0;
		this.maxStageNumber = 1;
		this.score = 0;
		this.scoreLevel = 0; // 桁数。スコアが変わるたびに変更される。
		this.hitChain = 0;  // 連鎖ボーナス用
		this.missChain = 0; // 連鎖ペナルティ用
		// プログラム関連
		this.currentProgram = undefined;
		this.setProgram();
	}
	setProgram(){
		// どの範囲の数がどれくらいの確率で出るかみたいなこと
		if(this.stageNumber === 0){
			this.enemyArray.push(new enemy(33, 100));
			this.enemyArray.push(new enemy(6, 150));
		  this.enemyArray.push(new enemy(31, 200));
			this.enemyArray.push(new enemy(6, 250));
			this.enemyArray.push(new enemy(33, 300));
			//this.currentProgram = simpleProgram([10, 99], [180, 220], 240); // 4秒おきに中央付近に2桁の敵を1匹ずつ
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
					if(!e.alive){ this.createEffect(e.x, e.y, e.diam, e.color); }
				}
			}
		}
	}
	toNextStage(){
		this.stageNumber = (this.stageNumber + 1) % this.maxStageNumber;
	}
	reset(){
		this.enemyArray = [];
		this.shotArray = [];
		this.myCannon.reset();
		this.score = 0; // スコアリセット
		this.scoreLevel = 0; // スコアレベルリセット
		// chainのリセット忘れずに
		this.hitChain = 0;
		this.missChain = 0;
		this.setProgram();
	}
	update(){
		this.enemyArray.forEach((e) => { e.update(); })
		this.shotArray.forEach((s) => { s.update(); });
		this.effectArray.forEach((ef) => { ef.update(); });
		this.myCannon.update();
	}
	render(){
		this.enemyArray.forEach((e) => { e.render(); })
		this.shotArray.forEach((s) => { s.render(); });
		this.effectArray.forEach((ef) => { ef.render(); });
		this.myCannon.render();
	}
	drawStatus(){
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
		//let factor = Math.floor(frameCount / 60) % 7;
		text(this.score, 460 - 10 * this.scoreLevel, 530); // 1桁、2桁、・・・、7桁について460, 450, 440, 430, 420, 410, 400って感じかな・・
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
	createEffect(x, y, diam, col){
		this.effectArray.push(new effect(x, y, diam, col));
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
			if(flag !== 0){ this.calcChain(flag); } // フラグが0の場合は何もしない
			if(flag === 4){ s.setHitFlag(0); } // 弾かれた場合はフラグを0にする
			if(s.active){ continue; }
			this.shotArray.splice(i, 1); // not activeなら排除
		}
		// 倒したenemyを排除する
		for(let i = 0; i < this.enemyArray.length; i++){
			if(i === this.enemyArray.length){ break; }
			if(this.enemyArray[i].alive){ continue; }
			// とりあえずこのタイミングで倒した敵のスコアが・・それだけ、ね。
			let index = this.enemyArray[i].getUniqueIndex();
			this.calcScore(baseScore[index] * this.hitChain); // ここにthis.hitChainを掛ける感じ。
			this.enemyArray.splice(i, 1);
		}
		// 終了したeffectを排除する
		for(let i = 0; i < this.effectArray.length; i++){
			if(i === this.effectArray.length){ break; }
			if(this.effectArray[i].life > 0){ continue; }
			this.effectArray.splice(i, 1);
		}
	}
	check(){
		// 衝突判定、消滅判定、GAMEOVER判定。
		this.collisionCheck(); // ここでshotのフラグが確定する
		this.remove(); // shotのフラグを元にchainが計算され、それを元に敵を倒した場合のスコアも計算される
		for(let i = 0; i < this.enemyArray.length; i++){
			if(this.enemyArray[i].arrived){ this.reset(); break; } // 陣地に到達されたらGAMEOVER.
			if(this.enemyArray[i].num >= 10000000){ this.reset(); break; } // 数字が8桁を超えたらGAMEOVER.
		}
	}
	calcChain(flag){
    switch(flag){
			case 1:
				this.hitChain += 1; this.missChain = 0; this.calcScore(100);
				break;
			case 2:
				this.hitChain += 3; this.missChain = 0; this.calcScore(300);
				break;
			case 3:
				this.hitChain = 0; this.missChain = 0; this.calcScore(50);
				break;
			case 4:
				this.hitChain = 0; this.missChain++; this.calcScore(-100 * this.missChain);
				break;
			case 5:
				this.hitChain = 0;
				break;
		}
	}
	calcScore(diff){
		// diffの分だけスコアを増減する（減らすときはここに負の数が入る）
		// 0未満や10000000以上にはならないようにする
		this.score = constrain(this.score + diff, 0, 10000000);
		this.calcScoreLevel();
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
}

// これをmasterがいくつか持ってて、updateさせて準備が出来たらgenerateさせて別メソッドでenemyArrayに補充する感じ。
// signalをtrueにすれば・・で、いくつかenemy,ひとつとは限らない、複数かも知れないそれらをこっちで用意してenemy配列を出力。
// masterがそれを受け取ってenemyArrayに追加する流れ。
// 要は、何フレーム後にいくつを数指定で位置指定するだけ. 指定するのは数と位置だけなので。数も位置も固定とランダムの2通りで指定できる。
// 両方を受け取る方法・・typeofしてnumberなら固定、そうでなければランダム指定（[2, 3]とか。objectになる。）
// [3, 9]ってやったときに3,4,5,6,7,8,9のうちどれかが出て欲しい。関数作ろう。
class program{
	constructor(){
		this.count = 0;
	}
	update(){
		this.count++;
	}
	generate(command){
	}
}

// 一定の範囲に一定フレームごとに1匹ずつ出現させるプログラム。
class simpleProgram extends program{

}

// objが4とか9のときは4や9を返す。[11, 13]とかならたとえばこのときは11, 12, 13のどれかを返す。
// typeof便利やな。どんどん使っていこう。
// numとxの組を返す関数。すなわち敵の情報のすべて。
function getParam(n, p){
	let num, x;
	if(typeof(n) === "number"){ num = n; }else{ num = Math.floor(random(n[0], n[1] + 1)); }
	if(typeof(p) === "number"){ x = p; }else{ x = random(p[0], p[1]); }
	return {num:num, x:x};
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
