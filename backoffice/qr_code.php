<?php
	header('content-type:png');

	include(dirname(__FILE__)."/application/libraries/phpqrcode/qrlib.php");
	QRcode::png( urlencode($_GET['b_address']), null, QR_ECLEVEL_L, 4, 0);


?>