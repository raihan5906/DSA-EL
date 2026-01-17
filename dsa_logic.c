#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#define ALPHABET_SIZE 27 // a-z + space

struct TrieNode {
    struct TrieNode *children[ALPHABET_SIZE];
    int isEndOfWord;
    int weight; // Tracks popularity
};

struct Suggestion {
    char word[100];
    int weight;
};

int getIdx(char c) {
    if (c == ' ') return 26;
    if (c >= 'a' && c <= 'z') return c - 'a';
    if (c >= 'A' && c <= 'Z') return c - 'A';
    return -1;
}

struct TrieNode *getNode(void) {
    struct TrieNode *pNode = (struct TrieNode *)malloc(sizeof(struct TrieNode));
    pNode->isEndOfWord = 0;
    pNode->weight = 0;
    for (int i = 0; i < ALPHABET_SIZE; i++) pNode->children[i] = NULL;
    return pNode;
}

void insert(struct TrieNode *root, const char *key, int w) {
    struct TrieNode *pCrawl = root;
    for (int i = 0; i < strlen(key); i++) {
        int index = getIdx(key[i]);
        if (index == -1) continue;
        if (!pCrawl->children[index]) pCrawl->children[index] = getNode();
        pCrawl = pCrawl->children[index];
    }
    pCrawl->isEndOfWord = 1;
    pCrawl->weight += w; // Accumulate weight for popularity
}

// Collect matches for sorting
int count = 0;
struct Suggestion list[50];

void collect(struct TrieNode* root, char* prefix) {
    if (root->isEndOfWord && count < 50) {
        strcpy(list[count].word, prefix);
        list[count].weight = root->weight;
        count++;
    }
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (root->children[i]) {
            int len = strlen(prefix);
            prefix[len] = (i == 26) ? ' ' : i + 'a';
            prefix[len + 1] = '\0';
            collect(root->children[i], prefix);
            prefix[len] = '\0';
        }
    }
}

int compare(const void* a, const void* b) {
    return ((struct Suggestion*)b)->weight - ((struct Suggestion*)a)->weight;
}

int main(int argc, char *argv[]) {
    if (argc < 2) return 0;
    struct TrieNode *root = getNode();

    // Mode: "learn" or "suggest"
    if (strcmp(argv[1], "--learn") == 0 && argc == 3) {
        FILE *f = fopen("history.txt", "a");
        if (f) { fprintf(f, "%s\n", argv[2]); fclose(f); }
        return 0;
    }

    // Load History
    FILE *f = fopen("history.txt", "r");
    char line[100];
    if (f) {
        while (fgets(line, sizeof(line), f)) {
            line[strcspn(line, "\n")] = 0;
            insert(root, line, 1);
        }
        fclose(f);
    }

    // Find Prefix
    struct TrieNode* pCrawl = root;
    for (int i = 0; i < strlen(argv[1]); i++) {
        int index = getIdx(argv[1][i]);
        if (index == -1 || !pCrawl->children[index]) return 0;
        pCrawl = pCrawl->children[index];
    }

    char buffer[100]; strcpy(buffer, argv[1]);
    collect(pCrawl, buffer);
    qsort(list, count, sizeof(struct Suggestion), compare); // Sort by weight

    for (int i = 0; i < (count < 5 ? count : 5); i++) printf("%s,", list[i].word);
    return 0;
}