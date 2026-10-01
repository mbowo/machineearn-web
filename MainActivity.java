package com.machineearn.demo;

import android.app.*;
import android.os.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.io.*;
import java.net.*;
import java.util.regex.*;

public class MainActivity extends Activity {
    LinearLayout content;
    TextView status, balance;
    String sid="";
    final String API="http://10.0.2.2:3000";

    public void onCreate(Bundle b){super.onCreate(b);build();home();}

    TextView text(String s,int sp,boolean bold){
        TextView t=new TextView(this); t.setText(s); t.setTextSize(sp);
        t.setTextColor(Color.rgb(20,29,45)); t.setPadding(14,10,14,10);
        if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD); return t;
    }
    Button button(String s){Button b=new Button(this);b.setText(s);return b;}
    LinearLayout card(){LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(14,10,14,14);c.setBackgroundColor(Color.WHITE);return c;}
    void build(){
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(246,248,252));
        LinearLayout header=new LinearLayout(this);header.setGravity(Gravity.CENTER_VERTICAL);header.setPadding(12,4,8,4);header.setBackgroundColor(Color.rgb(15,23,42));
        TextView brand=text("MachineEarn",21,true);brand.setTextColor(Color.WHITE);header.addView(brand,new LinearLayout.LayoutParams(0,62,1));
        Button login=button("Login");header.addView(login,new LinearLayout.LayoutParams(-2,60));login.setOnClickListener(v->auth());
        root.addView(header);
        status=text("Demo • Offline",12,false);root.addView(status);
        ScrollView sc=new ScrollView(this);content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(10,8,10,16);sc.addView(content);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout nav=new LinearLayout(this);nav.setBackgroundColor(Color.WHITE);
        String[] tabs={"Home","Machines","Earnings","Profile"};
        for(String s:tabs){Button b=button(s);nav.addView(b,new LinearLayout.LayoutParams(0,62,1));b.setOnClickListener(v->{if(s.equals("Home"))home();if(s.equals("Machines"))machines();if(s.equals("Earnings"))earnings();if(s.equals("Profile"))profile();});}
        root.addView(nav);setContentView(root);
    }
    void clear(){content.removeAllViews();}
    void home(){
        clear();content.addView(text("Dashboard",28,true));
        LinearLayout hero=card();hero.addView(text("MachineEarn",18,true));hero.addView(text("Manage your demo machines and activity in one place.",15,false));
        balance=text("Balance\nLoading...",24,true);hero.addView(balance);content.addView(hero);
        LinearLayout quick=card();quick.addView(text("Quick actions",18,true));
        Button m=button("View machines");quick.addView(m);m.setOnClickListener(v->machines());
        Button e=button("View earnings");quick.addView(e);e.setOnClickListener(v->earnings());
        Button a=button("My machines & activity");quick.addView(a);a.setOnClickListener(v->activity());
        content.addView(quick);
        if(sid.isEmpty()){status.setText("Demo • Not logged in");content.addView(text("Log in to connect your demo account.",15,false));}
        else {
            status.setText("Demo • Connected");
            api("/api/dashboard","GET",null,(code,d)->runOnUiThread(()->{
                if(code==200){balance.setText("Demo balance\nKSh "+field(d,"balance")+"\n\nMy machines: "+count(d,"purchases"));}else balance.setText("Balance unavailable");}));
        }
        content.addView(text("Educational demo only — no real-money transactions.",13,false));
    }
    void machines(){
        clear();content.addView(text("Machine catalogue",27,true));content.addView(text("Choose a machine to add to your demo account.",15,false));
        LinearLayout pay=card();
        pay.addView(text("DEMO CHECKOUT",12,true));
        TextView payment=text("Loading demo payment details...",15,false);pay.addView(payment);
        EditText amount=new EditText(this);amount.setHint("Amount (demo only)");amount.setInputType(InputType.TYPE_CLASS_NUMBER);pay.addView(amount);
        Button checkout=button("Continue to demo checkout");pay.addView(checkout);
        checkout.setOnClickListener(v->{String a=amount.getText().toString().trim();if(a.isEmpty()||Integer.parseInt(a)<=0){Toast.makeText(this,"Enter a demo amount.",Toast.LENGTH_SHORT).show();return;}new AlertDialog.Builder(this).setTitle("Demo checkout").setMessage("Amount: KSh "+a+"\n\nThis is a simulation only. No money has been requested, received, or transferred.").setPositiveButton("Close",null).show();});
        content.addView(pay);
        api("/api/payment-info","GET",null,(pc,pd)->runOnUiThread(()->{if(pc==200)payment.setText("Payment method: "+str(pd,"method")+"\nDemo Till number: "+str(pd,"tillNumber")+"\n\nNo real payment is processed by this app.");else payment.setText("Demo payment details unavailable.");}));
        api("/api/machines","GET",null,(code,d)->runOnUiThread(()->{
            if(code!=200){content.addView(text("Server unavailable.",16,false));return;}
            Pattern p=Pattern.compile("\\{\"id\":\"([^\"]+)\",\"name\":\"([^\"]+)\",\"price\":([0-9.]+),\"description\":\"([^\"]*)\",\"demoRevenue\":([0-9.]+)");
            Matcher x=p.matcher(d);int n=0;
            while(x.find()){n++;String id=x.group(1),name=x.group(2),price=x.group(3),rev=x.group(5);
                LinearLayout c=card();c.addView(text(name,20,true));c.addView(text("KSh "+price,23,true));c.addView(text("Illustrative demo revenue: KSh "+rev,14,false));
                Button b=button(sid.isEmpty()?"Login to add":"Add demo machine");c.addView(b);
                if(sid.isEmpty())b.setOnClickListener(v->auth());else b.setOnClickListener(v->purchase(id));
                content.addView(c);
            }
            if(n==0)content.addView(text("No active machines.",16,false));
        }));
    }
    void purchase(String id){
        api("/api/purchases","POST","{\"machineId\":\""+esc(id)+"\"}",(code,d)->runOnUiThread(()->{
            Toast.makeText(this,code==201?"Demo machine added":"Could not add machine",Toast.LENGTH_SHORT).show();if(code==201)home();
        }));
    }

    void activity(){
        clear();content.addView(text("My Machines & Activity",27,true));
        if(sid.isEmpty()){content.addView(text("Log in to view your activity.",16,false));return;}
        TextView box=text("Loading activity...",16,false);content.addView(box);
        api("/api/dashboard","GET",null,(code,d)->runOnUiThread(()->{
            if(code!=200){box.setText("Unable to load activity.");return;}
            StringBuilder x=new StringBuilder("My machines: "+count(d,"purchases")+"\n\n");
            Matcher pm=Pattern.compile("\"machineName\":\"([^\"]+)\"").matcher(d);
            while(pm.find())x.append("• ").append(pm.group(1)).append("\n");
            x.append("\nWithdrawal requests: ").append(count(d,"withdrawals"));
            x.append("\n\nNotifications: ").append(count(d,"notifications"));
            box.setText(x.toString());
        }));
    }

    void earnings(){
        clear();content.addView(text("Earnings",27,true));
        if(sid.isEmpty()){content.addView(text("Log in to view your demo earnings.",16,false));return;}
        TextView info=text("Loading activity...",16,false);content.addView(info);
        EditText amount=new EditText(this);amount.setHint("Amount • minimum KSh 200");amount.setInputType(InputType.TYPE_CLASS_NUMBER);content.addView(amount);
        Button req=button("Request demo withdrawal");content.addView(req);
        req.setOnClickListener(v->{
            String a=amount.getText().toString().trim();if(a.isEmpty()){Toast.makeText(this,"Enter an amount.",Toast.LENGTH_SHORT).show();return;}
            api("/api/withdrawals","POST","{\"amount\":"+a+"}",(code,d)->runOnUiThread(()->{Toast.makeText(this,code==201?"Demo request submitted":"Request rejected",Toast.LENGTH_SHORT).show();if(code==201)earnings();}));
        });
        api("/api/dashboard","GET",null,(code,d)->runOnUiThread(()->{if(code==200)info.setText("Available demo balance: KSh "+field(d,"balance")+"\nRevenue: KSh "+field(d,"revenue")+"\nNotifications: "+count(d,"notifications")+"\n\nMinimum demo withdrawal: KSh 200");else info.setText("Unable to load dashboard.");}));
    }
    void profile(){
        clear();content.addView(text("Profile",27,true));
        if(sid.isEmpty()){content.addView(text("Not logged in.",16,false));Button b=button("Login / Register");content.addView(b);b.setOnClickListener(v->auth());return;}
        TextView p=text("Loading profile...",16,false);content.addView(p);
        api("/api/me","GET",null,(code,d)->runOnUiThread(()->{if(code==200)p.setText("Account\n\nName: "+str(d,"name")+"\nEmail: "+str(d,"email")+"\nRole: "+str(d,"role"));}));
        Button out=button("Log out");content.addView(out);out.setOnClickListener(v->{api("/api/logout","POST",null,(c,d)->runOnUiThread(()->{sid="";home();}));});
    }
    void auth(){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(10,0,10,0);
        EditText n=new EditText(this);n.setHint("Name (registration)");
        EditText e=new EditText(this);e.setHint("Email");
        EditText p=new EditText(this);p.setHint("Password (6+ characters)");p.setInputType(129);
        l.addView(n);l.addView(e);l.addView(p);
        new AlertDialog.Builder(this).setTitle("MachineEarn account").setView(l)
        .setPositiveButton("Login",(d,w)->login(e.getText().toString(),p.getText().toString()))
        .setNeutralButton("Register",(d,w)->register(n.getText().toString(),e.getText().toString(),p.getText().toString()))
        .setNegativeButton("Cancel",null).show();
    }
    void register(String n,String e,String p){api("/api/register","POST","{\"name\":\""+esc(n)+"\",\"email\":\""+esc(e)+"\",\"password\":\""+esc(p)+"\"}",(c,d)->runOnUiThread(()->Toast.makeText(this,c==201?"Account created":"Registration failed",Toast.LENGTH_LONG).show()));}
    void login(String e,String p){api("/api/login","POST","{\"email\":\""+esc(e)+"\",\"password\":\""+esc(p)+"\"}",(c,d,cookie)->runOnUiThread(()->{if(c==200&&cookie!=null){String q=cookie.split(";",2)[0];if(q.startsWith("sid="))sid=q.substring(4);home();}else Toast.makeText(this,"Login failed",Toast.LENGTH_LONG).show();}));}
    interface C{void done(int code,String data,String cookie);}
    void api(String path,String method,String body,C cb){
        new Thread(()->{HttpURLConnection c=null;try{
            c=(HttpURLConnection)new URL(API+path).openConnection();c.setRequestMethod(method);c.setConnectTimeout(5000);c.setReadTimeout(7000);
            if(!sid.isEmpty())c.setRequestProperty("Cookie","sid="+sid);
            if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");c.getOutputStream().write(body.getBytes("UTF-8"));}
            int code=c.getResponseCode();InputStream in=code<400?c.getInputStream():c.getErrorStream();BufferedReader r=new BufferedReader(new InputStreamReader(in));StringBuilder s=new StringBuilder();String line;while((line=r.readLine())!=null)s.append(line);
            cb.done(code,s.toString(),c.getHeaderField("Set-Cookie"));
        }catch(Exception ex){runOnUiThread(()->status.setText("Demo • Start node server.js"));cb.done(0,"",null);}finally{if(c!=null)c.disconnect();}}).start();
    }
    String field(String s,String k){Matcher m=Pattern.compile("\""+k+"\":([0-9.]+)").matcher(s);return m.find()?m.group(1):"0";}
    String str(String s,String k){Matcher m=Pattern.compile("\""+k+"\":\"([^\"]*)\"").matcher(s);return m.find()?m.group(1):"";}
    String count(String s,String k){Matcher m=Pattern.compile("\""+k+"\":\\[(.*?)\\]").matcher(s);if(!m.find()||m.group(1).trim().isEmpty())return"0";Matcher q=Pattern.compile("\\{").matcher(m.group(1));int n=0;while(q.find())n++;return""+n;}
    String esc(String s){return s.replace("\\","\\\\").replace("\"","\\\"");}
}