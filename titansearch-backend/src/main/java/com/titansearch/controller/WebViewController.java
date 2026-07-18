package com.titansearch.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class WebViewController {

    @RequestMapping(value = {
        "/",
        "/repository/**",
        "/favorites",
        "/settings"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
