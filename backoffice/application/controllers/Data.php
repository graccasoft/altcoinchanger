<?php

	defined('BASEPATH') OR exit('No direct script access allowed');

	class Data extends CI_Controller{
		
		public function __construct(){
			parent::__construct();
			$this->load->database();
		}
		
		
		
		public function market_data($pair, $period){
			header('Access-Control-Allow-Origin: *');
			
			$data = array();
			if($period == "12hr" || $period == "24hr"){
				$current_hour = date("H");
				
				$end_date = date("Y-m-d "). $current_hour.":00:00";
				$date_points[] = $end_date;
				
				$hours_cnt = 12;
				if($period == "24hr")
					$hours_cnt = 24;
					
				for($x =1; $x<$hours_cnt; $x++){
					
					$tmp = strtotime($end_date) - (60 * 60 * $x);
					$date_points[] = date("Y-m-d H:i:s", $tmp);			
				}
				
				$date_points = array_reverse($date_points);
				$cnt = 0;
				foreach( $date_points as $date ){
					
					if (isset($date_points[$cnt + 1]) ){
						$query = $this->db->query("select * from market_data 
													where time between '".$date."' and '".$date_points[$cnt + 1]."'");
													
					}else
						$query = $this->db->get_where("market_data", array("time" => $date) );
					
					$rows = $query->result_array();
					
					foreach($rows as $row){
						$tmp = array();
						$tmp[] = strtotime($row['time']) * 1000;
						$tmp[] = (float)$row['open'];
						$tmp[] = (float)$row['max'];
						$tmp[] = (float)$row['min'];
						$tmp[] = (float)$row['close'];
						$tmp[] = (float)$row['volume1'];
						
						$data[] = $tmp;
					}
					$cnt++;
				}
				
			} #END 12hr / 24hr
			
			
			if($period == "7days" || $period == "1month"){
								
				$end_date = date("Y-m-d H:i:s");
				$date_points[] = $end_date;
				
				$days_cnt = 7;
				if($period == "1month")
					$days_cnt = 30;
					
				for($x =1; $x<$days_cnt; $x++){
					
					$tmp = strtotime($end_date) - (60 * 60 * 24 * $x);
					$date_points[] = date("Y-m-d 23:50:00", $tmp);			
				}
				
				//var_dump($date_points);
				$date_points = array_reverse($date_points);
				$cnt = 0;
				foreach( $date_points as $date ){
					
					if (isset($date_points[$cnt + 1]) ){
						$query = $this->db->query("select * from market_data 
													where time between '".$date."' and '".$date_points[$cnt + 1]."'");
						
					}else
						$query = $this->db->get_where("market_data", array("time" => $date) );
					
					$rows = $query->result_array();
					
					foreach($rows as $row){
						$tmp = array();
						$tmp[] = strtotime($row['time']) * 1000;
						$tmp[] = (float)$row['open'];
						$tmp[] = (float)$row['max'];
						$tmp[] = (float)$row['min'];
						$tmp[] = (float)$row['close'];
						$tmp[] = (float)$row['volume1'];
						
						$data[] = $tmp;
					}
					$cnt++;
				}
				
			} #END 7 days

						
			#CLEAN data of duplicates
			echo $_GET['callback']."(".json_encode($data).")";
		}
		
		
		public function order_book($pair_id){
			header('Access-Control-Allow-Origin: *');
			
			$qry_buy_orders = $this->db->query("select amount, price from buy_order where pair_id=? and filled=? order by amount ", 
											array($pair_id,0)
											);
			$buy_orders = $qry_buy_orders->result_array();
			
			$qry_sell_orders = $this->db->query("select amount, price from sell_order where pair_id=? and filled=? order by amount ",
											 array($pair_id,0)
											);
			$sell_orders_tmp = $qry_sell_orders->result_array();
			
			$records_count = count($buy_orders) + count($sell_orders_tmp);
				
			for($x=0; $x< $records_count - count($buy_orders); $x++){
				$buy_orders[] = array("amount"=>0,"price"=>0);				
			}
			
			for($x =0; $x < count($buy_orders); $x++){
				$buy_orders[$x]['amount'] = (float)$buy_orders[$x]['amount'];
				$buy_orders[$x]['price'] = (float)$buy_orders[$x]['price'] * 10000;
			}
			
			$sell_orders = array();
			for($x=0; $x< $records_count - count($sell_orders_tmp); $x++){
				$sell_orders[] = array("amount"=>0,"price"=>0);				
			}
			
			foreach($sell_orders_tmp as $sell_order){
				$sell_order['amount'] = (float)$sell_order['amount'];
				$sell_order['price'] = (float)$sell_order['price'] * 10000;
				$sell_orders[] = $sell_order;
			}
			
			echo $_GET['callback']."(".json_encode( array('sell_orders'=>$sell_orders,'buy_orders'=>$buy_orders) ).")";		
		}
	
	
		public function get_member_balance($member_id, $currency){
			header('Access-Control-Allow-Origin: *');
			
			$query_current = $this->db->get_where("account_balance", array("member_id"=>$member_id,"currency"=>$currency) );
			$row_current = $query_current->row_array();
			
			$current_balance = isset($row_current['balance']) ? $row_current['balance'] : 0;
			
			#
			$pending_buy_orders_sql = " select sum((amount * price) - ((amount * price) *0.002)) as total from buy_order where pair_id in 
										(select id from pair where cur2 = ?)
										and member_id = ?
										and filled = '0'";
										
			$query_pending_buy_orders = $this->db->query($pending_buy_orders_sql, array($currency, $member_id));
			$row_pending_buy_orders = $query_pending_buy_orders->row_array();
			
			$pending_buy_orders	 = isset($row_pending_buy_orders['total']) ? $row_pending_buy_orders['total'] : 0;	
			
			#	
			$pending_sell_orders_sql = " select sum((amount * price) - ((amount ) *0.002)) as total from sell_order where pair_id in 
										(select id from pair where cur1 = ?)
										and member_id = ?
										and filled = '0'";
			$query_pending_sell_orders = $this->db->query($pending_sell_orders_sql, array($currency, $member_id));
			$row_pending_sell_orders = $query_pending_sell_orders->row_array();
			
			$pending_sell_orders	 = isset($row_pending_sell_orders['total']) ? $row_pending_sell_orders['total'] : 0;	
			
			$total_balance = $current_balance - $pending_buy_orders - $pending_sell_orders;
			
			echo json_encode( array("balance"=>$total_balance) );
		}
		
		private function get_member_account_balance($member_id, $currency){
			$query = $this->db->get_where("account_balance", array("member_id"=>$member_id, "currency"=>$currency));
			$row = $query->row_array();
			
			return isset($row['balance']) ? $row['balance'] : 0;
		}
		
		private function get_member_balance_in_orders($member_id, $currency){
			#
			$pending_buy_orders_sql = " select sum((amount * price) - ((amount * price) *0.002)) as total from buy_order where pair_id in 
										(select id from pair where cur2 = ?)
										and member_id = ?
										and filled = '0'";
										
			$query_pending_buy_orders = $this->db->query($pending_buy_orders_sql, array($currency, $member_id));
			$row_pending_buy_orders = $query_pending_buy_orders->row_array();
			
			$pending_buy_orders	 = isset($row_pending_buy_orders['total']) ? $row_pending_buy_orders['total'] : 0;
			
			#	
			$pending_sell_orders_sql = " select sum((amount * price) - ((amount ) *0.002)) as total from sell_order where pair_id in 
										(select id from pair where cur1 = ?)
										and member_id = ?
										and filled = '0'";
			$query_pending_sell_orders = $this->db->query($pending_sell_orders_sql, array($currency, $member_id));
			$row_pending_sell_orders = $query_pending_sell_orders->row_array();
			
			$pending_sell_orders	 = isset($row_pending_sell_orders['total']) ? $row_pending_sell_orders['total'] : 0;	
			
			return $pending_buy_orders + $pending_sell_orders;
			
		}
		
		private function get_pending_deposits_total($member_id, $currency){
			
			$sql_pending_deposits = "select sum(amount) as total from deposit where currency =? and member_id =?
									and status != 'COMPLETED'";	
			$query = $this->db->query($sql_pending_deposits, array($currency, $member_id));
			$row = $query->row_array();
			
			return isset($row['total']) ? $row['total'] : 0;
		}
		
		public function get_member_wallets($member_id){
			#get all tokens
			#get balance from account_balance
			#get amount tied in orders
			#get pending deposit	
			
			$query_tokens = $this->db->get_where("token", array("active" =>1));
			$tokens = $query_tokens->result_array();
			
			$wallets = array();
			$est_total_btc = 0;
			
			foreach($tokens as $token){
				
				$tmp = array();
				
				$tmp['currency'] = $token['symbol'];
				$tmp['balance'] = $this->get_member_account_balance($member_id, $token['symbol']);
				$tmp['awaiting_deposit'] = $this->get_pending_deposits_total($member_id, $token['symbol']);
				$tmp['in_orders'] = $this->get_member_balance_in_orders($member_id, $token['symbol']);
				
				#TODO: calculate/rate to BTC				
				$tmp['to_btc'] = 0;
				$est_total_btc+= $tmp['to_btc'];
				
				$wallets[] = $tmp;
			}
			
			echo json_encode( array('wallets'=>$wallets, 'est_total_btc'=>$est_total_btc) );
		}
	}


	