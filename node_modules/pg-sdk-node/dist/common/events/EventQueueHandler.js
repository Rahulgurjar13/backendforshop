"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventQueueHandler = void 0;
const async_mutex_1 = require("async-mutex");
class EventQueueHandler {
    constructor(maxSize) {
        this.mutex = new async_mutex_1.Mutex();
        this.add = (event) => __awaiter(this, void 0, void 0, function* () {
            yield this.mutex.runExclusive(() => {
                if (this.queue.length < this.maxSize && event != null) {
                    this.queue.push(event);
                }
                else {
                    console.warn('Reached queue max size, skipping event {}', event.eventName);
                }
            });
        });
        this.isEmpty = () => {
            return this.queue.length == 0;
        };
        this.size = () => {
            return this.queue.length;
        };
        this.poll = () => __awaiter(this, void 0, void 0, function* () {
            return yield this.mutex.runExclusive(() => {
                return this.queue.shift();
            });
        });
        this.maxSize = maxSize;
        this.queue = [];
    }
}
exports.EventQueueHandler = EventQueueHandler;
