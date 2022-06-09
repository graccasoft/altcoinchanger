<?php

	defined('BASEPATH') OR exit('No direct script access allowed');
	use BlockCypher\Auth\SimpleTokenCredential;
	use BlockCypher\Rest\ApiContext;
	use BlockCypher\Client\PaymentForwardClient;
	use BlockCypher\Client\WebHookClient;
	use BlockCypher\Api;
	
	class Wallets extends CI_Controller{
		
		public function __construct(){
			parent::__construct();
			$this->load->database();
		}
		
		public function test(){
			require __DIR__ . '/../libraries/blockcypher/BlockCypher-php-client-1.5.0/php-client/autoload.php';
			#create webhook
			$apiContext = ApiContext::create(
				'main', 'ltc', 'v1',
				new SimpleTokenCredential('394fb92b02dd495ab6ab32c36ebece94'),
				array()
			);
			$webHook = new BlockCypher\Api\WebHook();
			$webHook->setUrl("http://altcoinchanger.io/backoffice/index.php/cron/confirmed_webhook");
			$webHook->setEvent('tx-confirmation');
			$webHook->setHash('60346d1e7716e3923a2cba9ca5f83ffa3ff93a98e7a74e5496c3b96b9baf379d');
			
			$webHookClient = new \BlockCypher\Client\WebHookClient($apiContext);
			$webHook = $webHookClient->create($webHook);
			
			echo $webHook;
		}
		
		public function need_addresses($currency){
			
			//$currency = $this->input->post('currency');
			
			#fancy algorithm to check number of available addresses
			$allowed_available_level = 10;
			
			$query_check = $this->db->get_where("deposit_address", array("member_id"=>0,"currency" =>$currency));
			$results_check = $query_check->result_array();
			
			$result = array('needs_addresses' => false);
			if( count($results_check) <= $allowed_available_level ){
				//$result['needs_addresses'] = true;
				return true;
			}
			
			//die( json_encode($result) );
			return false;
		}
		
		public function save_addresses(){
			header('Access-Control-Allow-Origin: *');
			
			$currency = $this->input->post('currency');
			$this->db->trans_start();
			
			foreach($_POST['address'] as $address){
				$data = array(	'currency' => strtoupper($currency),
								'address' => $address,
								'date' => date('Y-m-d H:i:s'),
								'member_id' => 0,
								'allocated_date' => '0000:00:00 00:00:00' );
								
				$this->db->insert("deposit_address", $data);
			}
			
			$this->db->trans_complete();	
			if ($this->db->trans_status() === FALSE){
				die( json_encode(array("status"=>"failed")) );
			}else{
				die( json_encode(array("status"=>"success")) );
			}
			
		}
		
		public function get_tokens($for_addresses = 0){
			header('Access-Control-Allow-Origin: *');
			
			$query = $this->db->get_where( "token",array("active"=>1) );
			$tokens = $query->result_array();
			
			if($for_addresses == 1){
				$tmp_data = array();
				foreach($tokens as $token){
					$need_addresses = $this->need_addresses($token['symbol']);
					$token['need_addresses'] = 0;
					
					if($need_addresses)
						$token['need_addresses'] = 1;
					
					$tmp_data[] = $token;	
				}
				
				$tokens = $tmp_data;
			}
			
			die( json_encode($tokens) );
		}
		
		public function get_token($symbol){
			$query = $this->db->get_where("token", array("symbol"=>$symbol));
			return $query->row_array();	
		}
		
		public function create_deposit(){
			
			$address = 	$this->input->post('address');
			$currency = $this->input->post('currency');
			$transaction_id = $this->input->post('transaction_id');
			$status = $this->input->post('status');
			$amount = $this->input->post('amount');
			
			$query_member = $this->db->get_where("deposit_address", array("address"=>$address));
			$row_member = $query_member->row_array();
			$member_id = $row_member['member_id'];
			
			if($member_id == 0){
				die( json_encode(array("status"=>"failed")) );
			}
			
			$query_deposit = $this->db->get_where("deposit", array("transaction_id"=>$transaction_id,
																	"currency" => $currency));
			
			
			if( $query_deposit->num_rows() == 0 ){
				$data = array(	'member_id' => $member_id,
								'currency' => $currency,
								'amount' => $amount,
								'date' => date("Y-m-d H:i:s"),
								'status' => $status,
								'transaction_id' => $transaction_id,
								'balance_credited' => 0);
				$this->db->insert("deposit", $data);
			}else{
				
				$row_deposit = $query_deposit->row_array();
				
				$sql_update = "update deposit set status = ? where id = ? and transaction_id =?";
				$this->db->query($sql_update, array($status,$row_deposit['id'],$transaction_id));			
			}
			
			die( json_encode(array("status"=>"success")) );
		}
		
		#FUCK YEA
		public function process_deposit(){
			header('Access-Control-Allow-Origin: *');
			
			
			$json_text = file_get_contents('php://input');
		
			if (empty ($json_text))
				$json_text = $GLOBALS["HTTP_RAW_POST_DATA"];
			
				
			//$transaction_id 	= $this->input->post("input_transaction_hash");
			//$address 			= $this->input->post("input_address")/100000000;
			//$amount 			= $this->input->post("value");
			
			$payload_obj = json_decode($json_text);
			
			$transaction_id 	= $payload_obj->input_transaction_hash;
			$address 			= $payload_obj->input_address;
			$amount 			= $payload_obj->value/100000000;
			
			$confirmations 		= 0;
			
			$rs_deposit_address = $this->db->get_where("deposit_address", array('address'=>$address));
			$row_deposit_address = $rs_deposit_address->row_array();
			$currency 			= $row_deposit_address['currency'];
			
			$rs_check = $this->db->get_where("deposit", array("transaction_id" => $transaction_id,"currency"=>$currency) );
			
			if($rs_check->num_rows() == 0){
				
				#check previous deposits on same address
				$sql_previous = "select sum(amount) as total from deposit where address =?";
				$rs_previous = $this->db->query($sql_previous, array($address));
				$row_previous = $rs_previous->row_array();
				
				$deposited_amount = $amount - $row_previous['total'];
				
				#get member
				$rs_address = $this->db->get_where("deposit_address", array("address"=>$address,"currency"=>$currency));
				$row_address = $rs_address->row_array();
				$member_id = $row_address['member_id'];
				
				#create deposit record and update address record
				$this->db->trans_start();
				
				$sql_update_address = "update deposit_address set used = 1 where id = ?";
				$this->db->query($sql_update_address,array($row_address['id']));
				
				$data = array(	'member_id'=> $member_id,
								'currency'=> $currency,
								'amount'=> $deposited_amount,
								'date'=> date("Y-m-d h:i:s"),
								'status'=> 'PENDING',
								'transaction_id'=> $transaction_id,
								'balance_credited'=> 0,
								'address' => $address);
				$this->db->insert("deposit", $data);
				
				$this->db->trans_complete();
				
				#create webhook
				/*require __DIR__ . '/../libraries/blockcypher/BlockCypher-php-client-1.5.0/php-client/autoload.php';
				$apiContext = ApiContext::create(
					'main', $currency, 'v1',
					new SimpleTokenCredential('394fb92b02dd495ab6ab32c36ebece94'),
					array()
				);
				$webHook = new BlockCypher\Api\WebHook();
				$webHook->setUrl("http://altcoinchanger.io/backoffice/index.php/cron/confirmed_webhook");
				$webHook->setEvent('tx-confirmation');
				$webHook->setHash($transaction_id);
				
				$webHookClient = new \BlockCypher\Client\WebHookClient($apiContext);
				$webHook = $webHookClient->create($webHook);*/
				
				
			}else{#UPDATE STATUS
				$row_deposit = $rs_check->row_array();
				if($row_deposit['status'] != "COMPLETED"){
					
					
					$rs_token = $this->db->get_where("token", array("symbol"=>$currency));
					$row_token = $rs_token->row_array();
					if($row_token['confirmations'] <= $confirmations && $row_deposit['balance_credited'] == 0){
						#update deposit record
						
						$this->db->trans_start();
						
						$sql_update_dp =" update deposit set status ='COMPLETED', balance_credited = 1 
											where id = '$row_deposit[id]'";
						$this->db->query($sql_update_dp);
											
						#create record if not exists
						$rs_check_account = $this->db->get_where("account_balance", array("member_id"=>$row_deposit['member_id'],
																							"currency"=>$currency));
						if($rs_check_account->num_rows() == 0){
							
							$data_account = array(	'member_id' => $row_deposit['member_id'],
													'currency' => $currency,
													'balance' => $row_deposit['amount'] );
							$this->db->insert("account_balance", $data_account);
							
						}else{
							$sql_update_balance = "update account_balance set balance = (balance + $row_deposit[amount])
													where currency = '$currency' and member_id = '$row_deposit[member_id]'";
							$this->db->query($sql_update_balance);
						}
						$this->db->trans_complete();
					}
				}
			}
		}
		
		public function generate_deposit_address($currency, $member_id){
			header('Access-Control-Allow-Origin: *');
			
			if( strtolower($currency) == "eth" ){
				$this->generate_eth_address($member_id);
				return false;	
			}
			
			#determine tokens supported by this method
			$supported = array('btc','ltc','doge','dash');
			
			if( !in_array(strtolower($currency),$supported) ) {
				$err = array('token_error'=> 'token not supported');
				die(  json_encode( $err) );
				return false;
			}
			$currency = strtolower($currency);
			require __DIR__ . '/../libraries/blockcypher/BlockCypher-php-client-1.5.0/php-client/autoload.php';

			
			
			$apiContext = ApiContext::create(
				'main', $currency, 'v1',
				new SimpleTokenCredential('394fb92b02dd495ab6ab32c36ebece94'),
				array()
			);
			
			$token = $this->get_token($currency);
			
			$paymentForwardClient = new PaymentForwardClient($apiContext);
			$options = array(
				'callback_url' => 'http://altcoinchanger.io/backoffice/index.php/wallets/process_deposit',
				'token' => $currency
			);
			$paymentForward = $paymentForwardClient->createForwardingAddress($token['deposit_address'], $options);
			
			$paymentForwardOBJ = json_decode($paymentForward);
			
			#create address record
			$data = array(	'currency' => strtoupper($currency),
							'address' => $paymentForwardOBJ->input_address,
							'date' => date("Y-m-d H:i:s"),
							'member_id' => $member_id,
							'allocated_date' => date("Y-m-d H:i:s"),
							'used' => 0);
			$this->db->insert("deposit_address", $data);
			
			echo json_encode( array("deposit_address"=>$paymentForwardOBJ->input_address) );
			die();
		}
		
		
		public function generate_eth_address($member_id){
			
			$ch = curl_init();

			curl_setopt($ch, CURLOPT_URL,"https://api.blockcypher.com/v1/eth/main/addrs?token=394fb92b02dd495ab6ab32c36ebece94");
			curl_setopt($ch, CURLOPT_POST, 1);
			curl_setopt($ch, CURLOPT_POSTFIELDS,"");	
			
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			$paymentForward = curl_exec ($ch);
			
			$paymentForwardOBJ = json_decode($paymentForward);
			
			#create address record
			$data = array(	'currency' => 'ETH',
							'address' => "0x".$paymentForwardOBJ->address,
							'date' => date("Y-m-d H:i:s"),
							'member_id' => $member_id,
							'allocated_date' => date("Y-m-d H:i:s"),
							'used' => 0,
							'private_key' => $paymentForwardOBJ->private,
							'public_key' => $paymentForwardOBJ->public);
			$this->db->insert("deposit_address", $data);
			
			#create webhook
			$ch1 = curl_init( "https://api.blockcypher.com/v1/eth/main/hooks?token=394fb92b02dd495ab6ab32c36ebece94" );
			# Setup request to send json via POST.
			$payload_arr = array(	'event'=> 'unconfirmed-tx',
									'address' => "0x".$paymentForwardOBJ->address,
									'url' => 'http://altcoinchanger.io/backoffice/index.php/cron/confirmed_webhook');
			$payload = json_encode( $payload_arr );
			curl_setopt( $ch1, CURLOPT_POSTFIELDS, $payload );
			curl_setopt( $ch1, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
			# Return response instead of printing.
			curl_setopt( $ch1, CURLOPT_RETURNTRANSFER, true );
			# Send request.
			$result = curl_exec($ch1);
			curl_close($ch1);
			# Print response.
			//echo "<pre>$result</pre>";
			
			echo json_encode( array("deposit_address"=>"0x".$paymentForwardOBJ->address) );
			die();
		}
		
		#TODO: to divide by 1 with 18 zeros to get amount
	}
	