#Author: Gracious Mashasha
#for altcoinchanger.io
import time
import mysql.connector

#DB Variables
db_user = 'root'
db_password = ''
db_host = '127.0.0.1'
db_name = 'altcoin_changer'
#END  DB Variables

fee_charge_percantage = 0.002

def do_matching():
    
	#print("In do_matching now: "+ time.ctime())
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	
	#update_sql = "update buy_order set `filled` = '1' where id = '1'"
	#update_buy_order = cnx.cursor()
	#print(update_sql)
	#update_buy_order.execute(update_sql)
	#return False
	#------------------
	
	# ONE
	#close buy orders with matching sell order volumes
	buy_orders = cnx.cursor()		
	buy_orders.execute("select * from buy_order where filled =0 limit 10")
	for row in buy_orders.fetchall():
		search_sell_orders = cnx.cursor()
		search_sell_orders_sql = "select * from sell_order where amount = "+str(row[3])+" and price <= "+str(row[4])+" and filled =0 and pair_id = '"+ str(row[2]) +"' order by id "; 
		search_sell_orders.execute(search_sell_orders_sql);
		if search_sell_orders.rowcount > 0:
		
			#fill this buy order
			update_buy_order = cnx.cursor()
			update_buy_order.execute("update buy_order set filled = 1 where id = '"+str(row[0])+"'")
			cnx.commit()
			update_buy_order.close()
			search_row = search_sell_orders.fetchone()
			fill_sell_order(row[1], search_row[0])
				
	
	
	# TWO
	#close all buy orders and leave balances
	#find smaller sell orders of eqaul or less rate 
	#close sell, lessen buy order
	sql_buy_orders = "select * from buy_order where filled =0 limit 10"
	buy_orders1 = cnx.cursor()
	buy_orders1.execute( sql_buy_orders )
	for row in 	buy_orders1.fetchall():
		search_sql = "select * from sell_order where amount < "+str(row[3])+" and price <= "+str(row[4])+" and pair_id = '"+ str(row[2]) +"' and filled =0 order by id "

		search_qry = cnx.cursor()
		search_qry.execute( search_sql )
		
		if search_qry.rowcount > 0:
			
			search_row = search_qry.fetchone();
			
			difference = row[3] - search_row[3];
			#lessen buy order
			update_buy_order = cnx.cursor()
			update_buy_order.execute("update buy_order set amount = '"+str(difference)+"' where id = '"+str(row[0])+"'")		
			cnx.commit()
			update_buy_order.close()
			fill_sell_order( row[1], search_row[0] )
	
	# THREE
	#find sell orders to close buy orders
	#find smaller buy orders of equal or greater rate
	#close buy and lessen sell order
	sql_sell_orders = "select * from sell_order where filled =0 limit 10"
	sell_orders = cnx.cursor()
	sell_orders.execute( sql_sell_orders )
	for row in sell_orders.fetchall():
		search_sql = "select * from buy_order where amount < "+str(row[3])+" and price >= "+str(row[4])+" and pair_id = '"+ str(row[2]) +"' and filled =0 order by id "
		
		search_qry = cnx.cursor()
		search_qry.execute( search_sql )
		
		if search_qry.rowcount > 0:
			
			search_row = search_qry.fetchone()
			
			difference = row[3] - search_row[3];
			#lessen buy order
			update_buy_order = cnx.cursor()
			
			update_buy_order.execute("update sell_order set amount = "+str(difference)+" where id = '"+str(row[0])+"'")
			cnx.commit()
			update_buy_order.close()
			fill_buy_order( row[1], search_row[0] )
	
	#CLOSE DB Connection	
	cnx.close()

def fill_sell_order(member_id, sell_order_id):
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	#check if order is not filled yet.
	check_qry = cnx.cursor()
	check_qry.execute( "select * from sell_order where filled = '1' and id = "+str(sell_order_id) )
		
	if( check_qry.rowcount > 0):		
		return false
	
	check_qry.close()
	
	#UPDATE SELL ORDER AS FILLED
	update_sql = "update sell_order set filled = '1' where id = "+str(sell_order_id)
	update_sell_order = cnx.cursor()
	update_sell_order.execute(update_sql)
	cnx.commit()
	update_sell_order.close()
	
	#CREATE FILLED ORDER RECORD
	order = get_sell_order( sell_order_id )	
	fees = order[5]
	
	insert_sql = "insert into sell_order_filled(date,member_id,sell_order_id,fees) values(NOW(), '"+str(member_id)+"','"+str(sell_order_id)+"','"+str(fees)+"')"
	insert_filled_order = cnx.cursor()
	insert_filled_order.execute(insert_sql)
	cnx.commit()
	insert_filled_order.close()
	#move funds		
	pair = get_pair(order[2])
	
	#move CUR1 to buyer		
	add_funds(member_id, pair[1], (order[3] - (order[3] * fee_charge_percantage) ))	
	#move CUR2  from buyer
	deduct_funds(member_id, pair[2], (order[3] ) )
	
	#move CUR1 from seller/order owner		
	deduct_funds(order[1], pair[1], (order[3] ))
	#move CUR2 currency to seller/order owner	
	add_funds(order[1], pair[2], (order[3] * order[4])-fees )
	
	#CLOSE DB Connection
	cnx.close()
	
def fill_buy_order(member_id, buy_order_id):
				
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True
							  )
	#check if order is not filled yet.
	check_qry = cnx.cursor()
	check_qry.execute( "select * from buy_order where filled = '1' and id = "+str(buy_order_id) )
		
	if( check_qry.rowcount > 0):		
		return false
	
	check_qry.close();
	#UPDATE BUY ORDER AS FILLED
	update_sql = "update buy_order set `filled` = '1' where id = '"+str(buy_order_id)+"'"
	update_buy_order = cnx.cursor()	
	update_buy_order.execute(update_sql)
	cnx.commit()
	update_buy_order.close()
	
	#CREATE FILLED ORDER RECORD
	order = get_buy_order( buy_order_id )	
	fees = order[5]
	
	insert_sql = "insert into buy_order_filled(date,member_id,buy_order_id,fees) values(NOW(), '"+str(member_id)+"','"+str(buy_order_id)+"','"+str(fees)+"')"
	insert_filled_order = cnx.cursor()
	insert_filled_order.execute(insert_sql)
	cnx.commit()
	insert_filled_order.close()
	
	#move funds
	pair = get_pair(order[2])
	#move CUR1 from seller	
	deduct_funds(member_id, pair[1], (order[3] ) )
	#move CUR2 currency to seller
	add_funds(member_id, pair[2], (order[3] * order[4]) - fees )
	
	#move CUR1 to order owner		
	add_funds(order[1], pair[1], (order[3] - fees))
	#move CUR2 from order owner	
	deduct_funds(order[1], pair[2], (order[3] * order[4]) - fees )
	
	#CLOSE DB Connection
	cnx.close()

def add_funds(member_id, currency, amount):
	
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	check_sql = "select * from account_balance where member_id ='"+str(member_id)+"' and currency = '"+str(currency)+"'"
	
	check_qry = cnx.cursor()
	check_qry.execute( check_sql )
	
	#insert if first time	
	if( check_qry.rowcount == 0):
		
		insert_sql = "insert into account_balance(member_id,currency,balance) values('"+str(member_id)+"','"+str(currency)+"','0')"
		insert_qry = cnx.cursor()
		insert_qry.execute( insert_sql )
		cnx.commit()
		insert_qry.close()
		
		check_qry.execute( check_sql )

		
	row_current = check_qry.fetchone()
	new_balance = row_current[3] + amount
	sql_update  = "update account_balance set balance = '"+str(new_balance)+"' where member_id ='"+str(member_id)+"' and currency = '"+str(currency)+"'"
	
	update_qry = cnx.cursor()
	update_qry.execute( sql_update )
	cnx.commit()
	update_qry.close()
	#CLOSE DB Connection
	cnx.close()

def deduct_funds(member_id, currency, amount):
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	check_sql = "select * from account_balance where member_id ='"+str(member_id)+"' and currency = '"+str(currency)+"'"
	check_qry = cnx.cursor()
	check_qry.execute( check_sql )
	
	#insert if first time	
	if( check_qry.rowcount == 0):
		
		insert_sql = "insert into account_balance(member_id,currency,balance) values('"+str(member_id)+"','"+str(currency)+"','0')"
		insert_qry = cnx.cursor()
		insert_qry.execute( insert_sql )
		cnx.commit()
		insert_qry.close()
		
		check_qry.execute( check_sql )
	
	row_current = check_qry.fetchone()
	new_balance = row_current[3] - amount
	sql_update  = "update account_balance set balance = '"+str(new_balance)+"' where member_id ='"+str(member_id)+"' and currency = '"+str(currency)+"'"
	
	update_qry = cnx.cursor()
	update_qry.execute( sql_update )
	cnx.commit()
	update_qry.close()
	
	#CLOSE DB Connection
	cnx.close()

def get_sell_order(sell_order_id):
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	check_sql = "select * from sell_order where id = '"+str(sell_order_id)+"'"
	check_qry = cnx.cursor()
	check_qry.execute( check_sql )
	
	sell_order = check_qry.fetchone()
	
	check_qry.close()
	
	#CLOSE DB Connection
	cnx.close()
	
	return sell_order

def get_buy_order(buy_order_id):
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	check_sql = "select * from buy_order where id = '"+str(buy_order_id)+"'"
	check_qry = cnx.cursor()
	check_qry.execute( check_sql )
	
	buy_order = check_qry.fetchone()
	
	check_qry.close()	
	#CLOSE DB Connection
	cnx.close()
	
	return buy_order

def get_pair(pair_id):
	cnx = mysql.connector.connect(user=db_user, password=db_password,
                              host=db_host,
                              database=db_name,
							  buffered = True)
	check_sql = "select * from pair where id = '"+str(pair_id)+"'"
	check_qry = cnx.cursor()
	check_qry.execute( check_sql )
	
	pair = check_qry.fetchone()
	
	check_qry.close()
	#CLOSE DB Connection
	cnx.close()
	
	return pair
	
def run():
	while True:
		do_matching()
		#time.sleep(5)

if __name__ == "__main__":
    run()