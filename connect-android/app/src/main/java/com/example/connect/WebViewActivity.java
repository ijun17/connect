package com.example.connect;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;

public class WebViewActivity extends AppCompatActivity {

    private WebView webView;

    private static final int REQUEST_EXTERNAL_STORAGE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);

        Intent intent = getIntent();
        String domain = intent.getStringExtra("domain");

        webView = findViewById(R.id.webView);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");
        webView.loadUrl(domain);
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQUEST_EXTERNAL_STORAGE);
        }
    }

    @Override
    protected void onDestroy(){
        super.onDestroy();
        webView.clearHistory();
        webView.clearCache(true);
        webView.reload();
        Log.d("connect", "clear cache");
    }

    private static class WebAppInterface {
        Context mContext;
        WebAppInterface(Context c) {
            mContext = c;
        }
        @JavascriptInterface
        public String getStartFolderPath() {
            return Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).toString();
        }
        @JavascriptInterface
        public String getFolder(String path) {
            File dir = new File(path);
            File[] files = dir.listFiles();

            if(files == null) {
                Toast.makeText(mContext, "error getFolder", Toast.LENGTH_SHORT).show();
                return null;
            }
            ArrayList<String> jsonArr = new ArrayList<>();
            for(File file : files){
                jsonArr.add("{\"name\":\""+file.getName()+"\",\"type\":\""+((file.isFile())?"file":"folder")+"\"}");
            }
            Toast.makeText(mContext, "get folder: "+path, Toast.LENGTH_SHORT).show();
            return "["+String.join(",",jsonArr)+"]";
        }
        @JavascriptInterface
        public String getFile(String path) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    byte[] fileContent = Files.readAllBytes(Paths.get(path));
                    String content = Base64.getEncoder().encodeToString(fileContent);
                    Toast.makeText(mContext, "get file: "+path, Toast.LENGTH_SHORT).show();
                    return content;
                }else{
                    return "null";
                }
            } catch (IOException e) {
                return "null";
            }
        }
        @JavascriptInterface
        public boolean saveFile(String path, String content) {
            File file = new File(path);
            try {
                // 파일에 내용 쓰기 (덮어쓰기 모드)
                FileOutputStream outputStream = new FileOutputStream(file, false);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    outputStream.write(Base64.getDecoder().decode(content));
                }else{
                    return false;
                }
                outputStream.close();
            } catch (IOException e) {
                return false;
            }
            Toast.makeText(mContext, "파일 저장: "+path, Toast.LENGTH_SHORT).show();
            return true;
        }
        @JavascriptInterface
        public boolean saveFolder(String path){
            File filePath = new File(path);
            if (!filePath.mkdirs()) {
                Toast.makeText(mContext, "폴더 저장 실패: "+path, Toast.LENGTH_SHORT).show();
                return false;
            }
            Toast.makeText(mContext, "폴더 저장: "+path, Toast.LENGTH_SHORT).show();
            return true;
        }
    }
}

