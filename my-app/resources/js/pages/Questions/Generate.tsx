import { Button } from '@/components/ui/button';                   
  import { Label } from '@/components/ui/label';                                 
  import AppLayout from '@/layouts/app-layout';                      
  import { show as testShow } from '@/routes/tests';                             
  import { generate, batchStore } from                                           
  '@/actions/App/Http/Controllers/QuestionController';                           
  import { type BreadcrumbItem, type Test } from '@/types';                      
  import { Head, router } from '@inertiajs/react';                               
  import { useState } from 'react';