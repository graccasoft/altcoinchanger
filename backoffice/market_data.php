<?php

	echo date("Y-m-d H:i:s",1516033200);
	die();
	mysql_connect("localhost","root","");
	mysql_select_db("altcoin_changer");
	
	set_time_limit(0);
	$start = "2018-01-15 22:00:00";
	
	for($x=0; $x<456; $x++){
		
		$tmp = $x * 60 *60;
		$time = strtotime($start) + $tmp;
		
		$volume1 = rand(100,2000);
		$volume2 = rand(100,2000);
		$open = rand(1,50);
		$max = rand(40,50);
		$min = rand(1,10);
		$close = rand(1,50);
		$time = date("Y-m-d H:i:s", $time);
		$sql = "insert into market_data(pair_id,volume1,volume2,open,max,min,close,time)values('1','$volume1','$volume2','$open','$max','$min','$close','$time')";
		
		//mysql_query($sql) or die(mysql_error());
	
	}
?>