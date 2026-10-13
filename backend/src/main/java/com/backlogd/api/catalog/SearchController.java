package com.backlogd.api.catalog;

import com.backlogd.api.media.MediaKind;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final CatalogService catalog;

    public SearchController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public List<CatalogItem> search(@RequestParam MediaKind kind, @RequestParam(defaultValue = "") String q) {
        return catalog.search(kind, q);
    }

    @GetMapping("/sources")
    public Map<MediaKind, Boolean> sources() {
        return catalog.searchableKinds();
    }
}
