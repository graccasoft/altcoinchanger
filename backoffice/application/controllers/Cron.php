<?php

	defined('BASEPATH') OR exit('No direct script access allowed');
	use BlockCypher\Auth\SimpleTokenCredential;
	use BlockCypher\Rest\ApiContext;
	use BlockCypher\Client\TXClient;
	
	class Cron extends CI_Controller{
		
		public function __construct(){
			parent::__construct();
			$this->load->database();
		}
		
		public function tickers(){
			
			$query = $this->db->get_where("pair", array("active"=>1) );
			foreach($query->result_array() as $row){
				
				$url = 'https://bleutrade.com/api/v2/public/getmarketsummary?market='. $row['cur1']. '_'.$row['cur2'];
				$ch = curl_init();
				curl_setopt( $ch,CURLOPT_URL, $url );
				curl_setopt( $ch,CURLOPT_POST, true );
				curl_setopt( $ch,CURLOPT_RETURNTRANSFER, true );
				curl_setopt( $ch,CURLOPT_SSL_VERIFYPEER, false );
		
				$result = curl_exec($ch );
				
				$obj = json_decode($result);
				$tickers = $obj->result[0];
				
				//echo $tickers->High."<br>";
				//echo $tickers->Low."<br>";
				//echo $tickers->Ask."<br>";
				//echo $tickers->Bid."<br>";
				
				if(isset($tickers->Ask) && isset($tickers->Bid)){
					$sql_update = "update pair set bid =?, ask=?, high_24=?, low_24=? where id =?";
					$this->db->query($sql_update, array($tickers->Bid,$tickers->Ask,$tickers->High,$tickers->Low,$row['id']) );
				}
				curl_close( $ch );
			
			}
			

		}
		
		public function get_token($symbol){
			$query = $this->db->get_where("token", array("symbol"=>$symbol));
			return $query->row_array();	
		}
	
		public function credit_deposits(){
			require __DIR__ . '/../libraries/blockcypher/BlockCypher-php-client-1.5.0/php-client/autoload.php';

			$apiContextBTC = ApiContext::create(
				'main', 'btc', 'v1',
				new SimpleTokenCredential('394fb92b02dd495ab6ab32c36ebece94'),
				array()
			);			
			$txClientBTC = new TXClient($apiContextBTC);
			
			$apiContextLTC = ApiContext::create(
				'main', 'ltc', 'v1',
				new SimpleTokenCredential('394fb92b02dd495ab6ab32c36ebece94'),
				array()
			);			
			$txClientLTC = new TXClient($apiContextLTC);
			
			$rs_deposits = $this->db->get_where("deposit", array("status"=>"PENDING") );
			foreach($rs_deposits->result_array() as $deposit){
				
				if(!empty($deposit['transaction_id'])){
					$transaction = "";
					$token = array();
					switch($deposit['currency']){
						case "btc":{
							$token = $this->get_token("btc");
							$transaction = $txClientBTC->get($deposit['transaction_id']);
							break;
						}
						case "ltc":{
							$token = $this->get_token("ltc");
							$transaction = $txClientLTC->get($deposit['transaction_id']);
							break;
						}
						
					}
					
					$transactionOBJ = json_decode( $transaction );
					if(isset($transactionOBJ->confirmations)){
						
						if($transactionOBJ->confirmations >= $token['confirmations']){
							
							#
							if($deposit['status'] != "COMPLETED"){					
					
								
								if($deposit['balance_credited'] == 0){
									#update deposit record
									
									$this->db->trans_start();
									
									$sql_update_dp =" update deposit set status ='COMPLETED', balance_credited = 1 
														where id = '$deposit[id]'";
									$this->db->query($sql_update_dp);
														
									#create record if not exists
									$rs_check_account = $this->db->get_where("account_balance", array("member_id"=>$deposit['member_id'],
																										"currency"=>$deposit['currency']));
									if($rs_check_account->num_rows() == 0){
										
										$data_account = array(	'member_id' => $deposit['member_id'],
																'currency' => $deposit['currency'],
																'balance' => $deposit['amount'] );
										$this->db->insert("account_balance", $data_account);
										
									}else{
										$sql_update_balance = "update account_balance set balance = (balance + $deposit[amount])
																where currency = '$deposit[currency]' and member_id = '$deposit[member_id]'";
										$this->db->query($sql_update_balance);
									}
									$this->db->trans_complete();
								}
							}

						}
					}
				}

			}
			
		}
		
		
		public function confirmed_webhook(){
			$json_text = file_get_contents('php://input');
		
			if (empty ($json_text))
				$json_text = $GLOBALS["HTTP_RAW_POST_DATA"];	
				
			$data = array('date'=>date("Y-m-d H:i:s"), 'data'=>$json_text);
			$this->db->insert("callback_dump", $data);
		}
	
		public function check_eth_deposits(){
			
		}
		
		public function create_wallet(){
			
			$base_url ="http://127.0.0.1:3000";
			$url = "/api/v2/create?password=Pword5364!&api_code=L0tu5not35!";
								
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL,$base_url.$url);				
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			//$json_data = curl_exec ($ch);
			
			//echo $json_data;
			/*{"guid":"002ca37a-beb0-412f-9dfa-6f1cc024e053","address":"1J5EufJbRj3iios1ktMtaHnX2r7kkSmXsg","warning":"Created non-HD wallet, for privacy and security, it is recommended that new wallets are created with hd=true"}*/
		}
		
		
		public function get_btc_balance(){
			$base_url ="http://127.0.0.1:3000";
			$url = "/merchant/002ca37a-beb0-412f-9dfa-6f1cc024e053/balance?password=Pword5364!&api_code=L0tu5not35!";
								
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL,$base_url.$url);				
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			$json_data = curl_exec ($ch);
			
			echo $json_data;
		}
		
		#WITHDRAWALS
		public function process_btc_withdrawals(){
			$query = $this->db->get_where("withdrawal", array("currency"=>"BTC","status"=>"PROCESSING") );
			$withdrawals = $query->result_array();
			
			$guid="002ca37a-beb0-412f-9dfa-6f1cc024e053";
			$main_password="Pword5364!";
			$base_url ="http://127.0.0.1:3000/merchant/$guid/payment?password=$main_password&";
			
			//$recepients = array();
			foreach($withdrawals as $withdrawal){
				//$recepients[$withdrawal['to_address']] = $withdrawal['amount'] * 100000000 ;
				$amt = $withdrawal['amount'] * 100000000;
				$url = "to=$withdrawal[to_address]&amount=$amt";
								
				$ch = curl_init();
				curl_setopt($ch, CURLOPT_URL,$base_url.$url);				
				curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
				$json_data = curl_exec ($ch);
				
				//echo $json_data;
				$response = json_decode($json_data);
				
				if( !isset($response->error) && isset($response->success) ){
					$sql = "update withdrawal set status = 'DONE' where id = $withdrawal[id]";		
					$this->db->query( $sql );
				}else{
					$data = array(	'withdrawal_id' => $withdrawal['id'],
									'date' => date('Y-m-d H:i:s'),
									'data' => $json_data);
									
					$this->db->insert("withdrawal_error_log", $data);
				}
				
			}
			
			//$url_recepients = urlencode( json_encode($recepients) );
			
			
		}
	}


